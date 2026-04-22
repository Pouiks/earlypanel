import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterWork } from "@/lib/project-lifecycle";

/**
 * POST : soumet la mission. Validation stricte : chaque question doit avoir une reponse non vide.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status, started_at")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .maybeSingle();

    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (pt.status !== "in_progress") {
      return NextResponse.json(
        { error: "La mission doit être en cours" },
        { status: 409 }
      );
    }

    const { data: project } = await admin
      .from("projects")
      .select("end_date, status")
      .eq("id", projectId)
      .single();

    if (!projectAllowsTesterWork(project?.status as string)) {
      return NextResponse.json({ error: "Le projet n'est pas ouvert aux tests" }, { status: 403 });
    }

    if (project?.end_date && new Date(project.end_date) < new Date()) {
      return NextResponse.json({ error: "Délai dépassé" }, { status: 400 });
    }

    const { data: questions } = await admin
      .from("project_questions")
      .select("id")
      .eq("project_id", projectId);

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Aucune question" }, { status: 400 });
    }

    const { data: answers } = await admin
      .from("project_tester_answers")
      .select("question_id, answer_text")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId);

    const answerMap = new Map<string, string>();
    (answers || []).forEach((a) => answerMap.set(a.question_id, (a.answer_text || "").trim()));

    const missing = questions.filter((q) => !answerMap.get(q.id));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Toutes les questions doivent être répondues",
          missing_question_ids: missing.map((q) => q.id),
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("project_testers")
      .update({
        status: "completed",
        submitted_at: now,
        completed_at: now,
      })
      .eq("id", pt.id);

    if (updateErr) {
      console.error("[mission/submit] update err:", updateErr);
      return NextResponse.json({ error: "Erreur soumission" }, { status: 500 });
    }

    // Increment mission counter
    await admin.rpc("apply_score_change", {
      p_tester_id: authed.testerId,
      p_delta: 5,
      p_reason: "Soumission mission (en attente de validation staff)",
      p_project_id: projectId,
    });

    return NextResponse.json({ success: true, submitted_at: now });
  } catch (err) {
    console.error("[mission/submit] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
