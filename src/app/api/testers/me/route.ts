import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { USE_MOCK_DATA, getMockTester, updateMockTester, isMockUnsafeInProd } from "@/lib/mock";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { recomputePersonaForTester } from "@/lib/persona-matcher";
import { backfillConnectionIfStuck } from "@/lib/tester-activation-repair";

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
