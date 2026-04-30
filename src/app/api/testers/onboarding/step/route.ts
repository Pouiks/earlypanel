import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { USE_MOCK_DATA, updateMockTester, isMockUnsafeInProd } from "@/lib/mock";
import {
  REQUIRED_FIELDS,
  checkStepCompleteness,
  computeProfileCompleteness,
} from "@/lib/profile-completeness";
import { checkJunkFields } from "@/lib/junk-detection";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputePersonaForTester } from "@/lib/persona-matcher";

// Liste utilisee pour le diagnostic final au step 5 : on relit le profil
// complet et on signale precisement quels champs sont encore vides. Source
// de verite alignee avec le trigger DB via REQUIRED_FIELDS.
function listMissingFieldKeys(profile: Record<string, unknown>): string[] {
  return computeProfileCompleteness(profile).missing.map((f) => f.key);
}

export async function PATCH(request: NextRequest) {
  if (isMockUnsafeInProd()) {
    console.error("[onboarding/step] Supabase config missing in production");
    return NextResponse.json(
      { error: "Service indisponible. Reessayez plus tard." },
      { status: 503 }
    );
  }
  if (USE_MOCK_DATA) {
    const body = await request.json();
    const isLast = body.step === 5;
    const updateData = {
      ...body.data,
      profile_step: body.step,
      ...(isLast ? { profile_completed: true, status: "active" as const } : {}),
    };
    updateMockTester(updateData);
    return NextResponse.json({
      success: true,
      mock: true,
      redirect: isLast ? "/app/dashboard" : undefined,
    });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { step, data } = await request.json();

  // G10 : valider strictement l'etape (entier 1..5).
  if (!Number.isInteger(step) || step < 1 || step > 5) {
    return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  }

  // G10 : data doit etre un objet plain. On rejette null/undefined/array.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
  }

  const forbidden = ["id", "created_at", "email", "auth_user_id", "status", "tier", "quality_score", "missions_completed", "total_earned", "stripe_account_id", "payment_setup", "profile_completed", "persona_id", "persona_locked", "source"];
  forbidden.forEach((key) => delete (data as Record<string, unknown>)[key]);

  // Detection des saisies bidons (azerty / Test / aaaa) sur les champs
  // texte sensibles aux faux comptes. Bloque tot dans le pipeline pour
  // que le testeur reformule sans avoir consomme un step.
  {
    const d = data as Record<string, unknown>;
    const junkCheck = checkJunkFields([
      { label: "Le prenom", value: typeof d.first_name === "string" ? d.first_name : null },
      { label: "Le nom", value: typeof d.last_name === "string" ? d.last_name : null },
      { label: "La ville", value: typeof d.city === "string" ? d.city : null },
      { label: "L'intitule de poste", value: typeof d.job_title === "string" ? d.job_title : null },
    ]);
    if (!junkCheck.ok) {
      return NextResponse.json({ error: junkCheck.reason }, { status: 400 });
    }
  }

  // Validation stricte des champs requis pour cette step (source : STEP_FIELDS).
  // Sans ca, un testeur pouvait progresser jusqu'au step 5 sans avoir rempli
  // par exemple connection ou company_size, et restait bloque en pending
  // apres l'onboarding (cf. cas browncarenza). On bloque ici, en remontant
  // la liste des champs manquants pour permettre a l'UI d'afficher un message.
  const missingForStep = checkStepCompleteness(step, data as Record<string, unknown>);
  if (missingForStep.length > 0) {
    const labels = missingForStep
      .map((key) => REQUIRED_FIELDS.find((f) => f.key === key)?.label ?? key)
      .join(", ");
    return NextResponse.json(
      {
        error: `Champs obligatoires manquants : ${labels}.`,
        missing_fields: missingForStep,
      },
      { status: 400 }
    );
  }

  // Validation specifique de la valeur de connection (CHECK constraint DB).
  if (step === 4) {
    const validConnections = new Set<string>(["Fibre", "ADSL", "4G/5G"]);
    const c = (data as Record<string, unknown>).connection;
    if (typeof c !== "string" || !validConnections.has(c)) {
      return NextResponse.json(
        { error: "Type de connexion requis (Fibre, ADSL ou 4G/5G)." },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, unknown> = {
    ...data,
    profile_step: step,
    updated_at: new Date().toISOString(),
  };

  if (step === 5) {
    // Ne PAS forcer profile_completed=true ici : le trigger `auto_activate_tester` (DB)
    // est le seul a poser profile_completed=true ET status='active' atomiquement,
    // et uniquement quand tous les champs requis sont presents.
    const { error: updateError } = await supabase
      .from("testers")
      .update(updatePayload)
      .eq("auth_user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Relire le profil pour connaitre l'etat reel apres declenchement du trigger.
    const { data: fullProfile } = await supabase
      .from("testers")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    // Recalcul automatique du persona a la fin de l'onboarding : tous les
    // champs de matching (job_title / sector / digital_level / company_size)
    // sont desormais saisis. Sans ca, le testeur reste sans persona jusqu'a
    // ce qu'il edite son profil depuis le dashboard.
    if (fullProfile?.id) {
      const adminClient = createAdminClient();
      if (adminClient) {
        try {
          await recomputePersonaForTester(adminClient, fullProfile.id);
        } catch (e) {
          console.error("[onboarding/step] persona recompute failed", e);
        }
      }
    }

    const reallyComplete = !!fullProfile && fullProfile.profile_completed === true;

    // Le cookie reflete l'etat reel : si le profil n'est pas complet, le middleware
    // continuera de rediriger vers /app/onboarding pour combler les manques.
    cookieStore.set("tp-profile", String(reallyComplete), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // SECURITE : flag `secure` en production (HTTPS uniquement).
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (reallyComplete) {
      return NextResponse.json({
        success: true,
        profile_completed: true,
        redirect: "/app/dashboard",
      });
    }

    // Profil incomplet : remonter clairement les champs manquants pour aider l'UX.
    const missing = fullProfile ? listMissingFieldKeys(fullProfile) : [];

    return NextResponse.json(
      {
        error: `Profil incomplet : champs manquants (${missing.join(", ")}). Revenez en arriere pour les completer.`,
        profile_completed: false,
        missing_fields: missing,
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("testers")
    .update(updatePayload)
    .eq("auth_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recompute persona des que les champs de matching sont susceptibles
  // d'avoir change (step 2 = job_title/sector/digital_level/company_size).
  // Au pire, recomputer quand rien n'a change est idempotent (cf. la guard
  // `if (newPersonaId !== tester.persona_id)` dans recomputePersonaForTester).
  if (step >= 2) {
    const adminClient = createAdminClient();
    if (adminClient) {
      const { data: row } = await adminClient
        .from("testers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (row?.id) {
        try {
          await recomputePersonaForTester(adminClient, row.id);
        } catch (e) {
          console.error("[onboarding/step] persona recompute failed", e);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
