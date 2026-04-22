import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterMissionVisibility } from "@/lib/project-lifecycle";

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
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

    const { data: tester } = await admin
      .from("testers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json([]);

    const { data: assignments, error } = await admin
      .from("project_testers")
      .select("id, project_id, status, nda_signed_at, invited_at, completed_at")
      .eq("tester_id", tester.id)
      .in("status", ["nda_signed", "invited", "in_progress", "completed"]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!assignments || assignments.length === 0) return NextResponse.json([]);

    const results = [];
    for (const pt of assignments) {
      const { data: project } = await admin
        .from("projects")
        .select("id, title, description, company_name, sector, urls, start_date, end_date, ref_number, status")
        .eq("id", pt.project_id)
        .single();

      if (!project) continue;
      if (!projectAllowsTesterMissionVisibility(project.status as string, pt.status)) continue;

      results.push({
        id: pt.id,
        assignment_id: pt.id,
        project_id: pt.project_id,
        tester_status: pt.status,
        nda_signed_at: pt.nda_signed_at,
        invited_at: pt.invited_at,
        completed_at: pt.completed_at,
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          company_name: project.company_name,
          sector: project.sector,
          urls: project.urls,
          start_date: project.start_date,
          end_date: project.end_date,
          ref_number: project.ref_number,
          status: project.status,
        },
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[missions] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
