import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeProfileCompleteness, REQUIRED_FIELDS } from "@/lib/profile-completeness";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* readonly */ }
        },
      },
    }
  );
}

const SELECT_FIELDS = ["id", "status", "profile_completed", ...REQUIRED_FIELDS.map((f) => f.key)].join(", ");

const EMPTY_PAYLOAD = { missions: 0, documents: 0, profil: 0, profil_missing: [] as string[], payment_info_missing: false };

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(EMPTY_PAYLOAD);

    const admin = createAdminClient();
    if (!admin) return NextResponse.json(EMPTY_PAYLOAD);

    const { data: tester } = await admin
      .from("testers")
      .select(SELECT_FIELDS)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json(EMPTY_PAYLOAD);

    const { data: assignments } = await admin
      .from("project_testers")
      .select("status, project_id")
      .eq("tester_id", (tester as unknown as { id: string }).id);

    let missionsCount = 0;
    let documentsCount = 0;

    if (assignments) {
      const activeStatuses = ["nda_signed", "invited", "in_progress"];
      const activePtIds = assignments.filter((a) => activeStatuses.includes(a.status));

      for (const pt of activePtIds) {
        const { data: project } = await admin
          .from("projects")
          .select("end_date, status")
          .eq("id", pt.project_id)
          .single();

        if (project?.status !== "active") continue;

        const endDate = project?.end_date;
        const notExpired = !endDate || new Date(endDate) >= new Date(new Date().toDateString());
        if (notExpired) missionsCount++;
      }

      documentsCount = assignments.filter((a) => a.status === "nda_sent").length;
    }

    // Calcul du compteur exact de champs manquants via la lib partagee
    // (source de verite alignee sur le trigger DB auto_activate_tester).
    const completeness = computeProfileCompleteness(tester as unknown as Record<string, unknown>);

    // Verifie si l'IBAN/CGU paiement est renseigne. On ne ramene pas la
    // ligne (donnees sensibles) : un simple count(*) suffit.
    const { count: paymentInfoCount } = await admin
      .from("tester_payment_info")
      .select("*", { count: "exact", head: true })
      .eq("tester_id", (tester as unknown as { id: string }).id);

    return NextResponse.json({
      missions: missionsCount,
      documents: documentsCount,
      profil: completeness.count,
      profil_missing: completeness.missing.map((f) => f.key),
      payment_info_missing: (paymentInfoCount ?? 0) === 0,
    });
  } catch {
    return NextResponse.json(EMPTY_PAYLOAD);
  }
}
