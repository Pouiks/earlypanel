import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterMissionVisibility, projectAllowsTesterWork } from "@/lib/project-lifecycle";
import { applyMissionClosureMalus } from "@/lib/apply-mission-closure-malus";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

    const { id: projectId } = await params;

    const { data: tester } = await admin
      .from("testers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status, nda_signed_at, invited_at, completed_at, started_at, submitted_at, malus_applied, malus_nda_unsigned_applied")
      .eq("project_id", projectId)
      .eq("tester_id", tester.id)
      .maybeSingle();

    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const allowedStatuses = ["nda_signed", "invited", "in_progress", "completed"];
    if (!allowedStatuses.includes(pt.status)) {
      return NextResponse.json({ error: "NDA non signé" }, { status: 403 });
    }

    const { data: project } = await admin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

    if (!projectAllowsTesterMissionVisibility(project.status as string, pt.status)) {
      return NextResponse.json({ error: "Mission non disponible" }, { status: 403 });
    }

    const projectActive = projectAllowsTesterWork(project.status as string);

    const { data: questions } = await admin
      .from("project_questions")
      .select("id, position, question_text")
      .eq("project_id", projectId)
      .order("position");

    const { data: rawAnswers } = await admin
      .from("project_tester_answers")
      .select("id, question_id, answer_text, image_urls, updated_at")
      .eq("project_id", projectId)
      .eq("tester_id", tester.id);

    // Convertir les chemins storage en signed URLs (1h)
    const answers = await Promise.all(
      (rawAnswers || []).map(async (a) => {
        const paths = (a.image_urls as string[]) || [];
        const signed = await Promise.all(
          paths.map(async (p) => {
            const { data } = await admin.storage
              .from("mission-images")
              .createSignedUrl(p, 60 * 60);
            return { path: p, signed_url: data?.signedUrl ?? null };
          })
        );
        return { ...a, images: signed };
      })
    );

    const closure = await applyMissionClosureMalus(
      admin,
      { end_date: project.end_date as string | null },
      {
        id: pt.id,
        status: pt.status,
        malus_applied: pt.malus_applied,
        malus_nda_unsigned_applied: pt.malus_nda_unsigned_applied,
      },
      tester.id,
      projectId
    );

    return NextResponse.json({
      tester_id: tester.id,
      tester_status: pt.status,
      nda_signed_at: pt.nda_signed_at,
      invited_at: pt.invited_at,
      completed_at: pt.completed_at,
      started_at: pt.started_at,
      submitted_at: pt.submitted_at,
      malus_applied: closure.malus_applied,
      malus_nda_unsigned_applied: closure.malus_nda_unsigned_applied,
      project_read_only: !projectActive,
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
      questions: questions || [],
      answers: answers || [],
    });
  } catch (err) {
    console.error("[missions/detail] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
