import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { USE_MOCK_DATA, updateMockTester, isMockUnsafeInProd } from "@/lib/mock";

const REQUIRED_TEXT_FIELDS = [
  "first_name", "last_name", "phone",
  "job_title", "sector", "company_size",
  "digital_level", "connection", "availability", "ux_experience",
] as const;

const REQUIRED_ARRAY_FIELDS = [
  "tools", "browsers", "devices", "interests",
] as const;

function isProfileComplete(profile: Record<string, unknown>): boolean {
  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!profile[field]) return false;
  }
  for (const field of REQUIRED_ARRAY_FIELDS) {
    const arr = profile[field];
    if (!Array.isArray(arr) || arr.length === 0) return false;
  }
  return true;
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

  // Le trigger BDD `auto_activate_tester` exige `connection` non vide ; sans cela
  // le testeur reste en pending. Etape 4 = seul endroit du wizard qui le pose.
  const validConnections = new Set<string>(["Fibre", "ADSL", "4G/5G"]);
  if (step === 4) {
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
    const missing: string[] = [];
    if (fullProfile) {
      for (const field of REQUIRED_TEXT_FIELDS) {
        if (!fullProfile[field]) missing.push(field);
      }
      for (const field of REQUIRED_ARRAY_FIELDS) {
        const arr = fullProfile[field];
        if (!Array.isArray(arr) || arr.length === 0) missing.push(field);
      }
    }

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

  return NextResponse.json({ success: true });
}
