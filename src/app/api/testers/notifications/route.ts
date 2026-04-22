import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ missions: 0, documents: 0, profil: 0 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ missions: 0, documents: 0, profil: 0 });

    const { data: tester } = await admin
      .from("testers")
      .select("id, address, city, postal_code, birth_date")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json({ missions: 0, documents: 0, profil: 0 });

    const { data: assignments } = await admin
      .from("project_testers")
      .select("status, project_id")
      .eq("tester_id", tester.id);

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

    const profilFields = [tester.address, tester.city, tester.postal_code, tester.birth_date];
    const profilMissing = profilFields.filter((f) => !f).length;

    return NextResponse.json({
      missions: missionsCount,
      documents: documentsCount,
      profil: profilMissing > 0 ? 1 : 0,
    });
  } catch {
    return NextResponse.json({ missions: 0, documents: 0, profil: 0 });
  }
}
