import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { USE_MOCK_DATA, getMockTester, updateMockTester, isMockUnsafeInProd } from "@/lib/mock";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { recomputePersonaForTester } from "@/lib/persona-matcher";
import { backfillConnectionIfStuck } from "@/lib/tester-activation-repair";
import { checkJunkFields } from "@/lib/junk-detection";
import { logStaffAction } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export async function GET() {
  if (isMockUnsafeInProd()) {
    console.error("[testers/me] Supabase config missing in production");
    return NextResponse.json(
      { error: "Service indisponible. Reessayez plus tard." },
      { status: 503 }
    );
  }
  if (USE_MOCK_DATA) {
    return NextResponse.json(getMockTester());
  }

  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    const { data, error } = await admin
      .from("testers")
      .select("*, persona:tester_personas(id, slug, name, description, min_reward_cents, max_reward_cents)")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[testers/me] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profil testeur non trouvé" }, { status: 404 });
    }

    const { applied } = await backfillConnectionIfStuck(admin, {
      id: data.id,
      status: data.status,
      connection: data.connection,
      profile_step: data.profile_step,
      profile_completed: data.profile_completed,
    });
    if (applied) {
      const { data: data2, error: err2 } = await admin
        .from("testers")
        .select("*, persona:tester_personas(id, slug, name, description, min_reward_cents, max_reward_cents)")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!err2 && data2) {
        const res = NextResponse.json(data2);
        res.cookies.set("tp-profile", String(!!data2.profile_completed), {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[testers/me] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  if (isMockUnsafeInProd()) {
    console.error("[testers/me] Supabase config missing in production");
    return NextResponse.json(
      { error: "Service indisponible. Reessayez plus tard." },
      { status: 503 }
    );
  }
  if (USE_MOCK_DATA) {
    const body = await request.json();
    updateMockTester(body);
    return NextResponse.json({ success: true, mock: true });
  }

  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();

  // SECURITE (G2) : allowlist STRICTE des champs editables par le testeur lui-meme.
  // Tout autre champ est ignore (status, tier, quality_score, missions_completed,
  // total_earned, stripe_account_id, payment_setup, profile_completed, profile_step,
  // persona_id, persona_locked, source, ainsi que id/auth_user_id/email/created_at).
  const TESTER_SELF_EDITABLE_FIELDS = [
    "first_name", "last_name", "phone", "linkedin_url",
    "address", "city", "postal_code", "birth_date",
    "job_title", "sector", "company_size", "digital_level",
    "tools", "browsers", "devices", "phone_model", "mobile_os",
    "connection", "availability", "timeslots", "interests", "ux_experience",
  ] as const;

  const sanitized: Record<string, unknown> = {};
  for (const key of TESTER_SELF_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sanitized[key] = (body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });
  }

  // Detection des saisies bidons (azerty / Test / aaaa) sur les champs
  // texte sensibles aux faux comptes. On laisse passer le vide / null.
  const junkCheck = checkJunkFields([
    { label: "Le prenom", value: typeof sanitized.first_name === "string" ? sanitized.first_name : null },
    { label: "Le nom", value: typeof sanitized.last_name === "string" ? sanitized.last_name : null },
    { label: "La ville", value: typeof sanitized.city === "string" ? sanitized.city : null },
    { label: "L'intitule de poste", value: typeof sanitized.job_title === "string" ? sanitized.job_title : null },
  ]);
  if (!junkCheck.ok) {
    return NextResponse.json({ error: junkCheck.reason }, { status: 400 });
  }

  const admin = createAdminClient();
  const client = admin || supabase;

  const { error } = await client
    .from("testers")
    .update({ ...sanitized, updated_at: new Date().toISOString() })
    .eq("auth_user_id", user.id);

  if (error) {
    console.error("[testers/me PATCH] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalcule le persona si des champs pertinents ont potentiellement change.
  if (admin) {
    const { data: row } = await admin
      .from("testers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (row?.id) {
      try {
        await recomputePersonaForTester(admin, row.id);
      } catch (e) {
        console.error("[testers/me PATCH] persona recompute failed", e);
      }
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/testers/me
 *
 * Droit a l'effacement RGPD (art. 17 RGPD) — le testeur supprime son
 * compte lui-meme. Comportement :
 *
 *   - Cascade DB sur project_testers, mission_answers, payouts, nda,
 *     tester_payment_info (toutes les FKs ON DELETE CASCADE).
 *   - Suppression de l'auth.users associe pour liberer l'email.
 *   - Deconnexion immediate (signOut) + cookies effaces.
 *   - Log immuable dans staff_audit_log avec action "tester.self_delete"
 *     et l'identite/email du compte (preuve de la demande RGPD).
 *
 * Garde-fou : si le testeur a des missions completees ou des paiements,
 * on refuse la suppression (HTTP 409). Il doit contacter le support a
 * contact@earlypanel.fr pour une anonymisation cas par cas (les rapports
 * clients exigent la conservation des donnees agregees).
 *
 * Securite : double confirmation cote client (saisie de l'email) +
 * verification origin + rate limit IP (anti-bot).
 */
export async function DELETE(request: NextRequest) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  if (isMockUnsafeInProd()) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`self-delete:ip:${ip}`, { windowMs: 60_000, max: 5 });
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

  // Lecture prealable pour audit + verification du garde-fou.
  const { data: tester, error: fetchError } = await admin
    .from("testers")
    .select("id, email, first_name, last_name, missions_completed, total_earned")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!tester) {
    // Pas de profil testeur : on supprime au moins le user auth pour ne pas
    // laisser un orphelin (cas tres rare : compte cree mais row testers
    // jamais inseree).
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    return NextResponse.json({ success: true, no_profile: true });
  }

  if (tester.missions_completed > 0 || (tester.total_earned ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Vous avez des missions completees ou des paiements en cours. La suppression complete necessite une anonymisation. Contactez contact@earlypanel.fr pour exercer votre droit a l'effacement RGPD.",
      },
      { status: 409 }
    );
  }

  // 1) Suppression DB (cascade sur toutes les tables liees).
  const { error: deleteError } = await admin
    .from("testers")
    .delete()
    .eq("id", tester.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 2) Suppression de l'auth user (libere l'email pour reinscription future).
  let authDeleted = false;
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error("[testers/me DELETE] auth user delete failed:", authError.message);
  } else {
    authDeleted = true;
  }

  // 3) Audit immuable (RGPD : preuve qu'on a bien execute la demande).
  await logStaffAction(
    {
      staff_id: null,
      staff_email: null,
      action: "tester.self_delete",
      entity_type: "tester",
      entity_id: tester.id,
      metadata: {
        deleted_email: tester.email,
        deleted_first_name: tester.first_name,
        deleted_last_name: tester.last_name,
        auth_user_deleted: authDeleted,
      },
    },
    request
  );

  // 4) Deconnexion + cookies effaces. Le client redirigera vers /.
  try {
    await supabase.auth.signOut();
  } catch {
    /* deja ko si user supprime au-dessus, mais on continue */
  }

  const res = NextResponse.json({ success: true, auth_user_deleted: authDeleted });
  res.cookies.set("tp-profile", "", { path: "/", maxAge: 0 });
  return res;
}
