import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterWorkWithGrace } from "@/lib/project-lifecycle";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";

/**
 * POST : soumet la mission. Validation stricte : chaque question doit avoir une reponse non vide.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!checkOrigin(request)) return forbiddenOriginResponse();

    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status, started_at, tester:testers(email)")
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

    // Fenetre de grace 24h apres end_date pour permettre aux testeurs in_progress
    // de soumettre meme si le cron `close-expired` a deja ferme le projet.
    if (
      !projectAllowsTesterWorkWithGrace(
        project?.status as string,
        (project?.end_date as string | null) ?? null
      )
    ) {
      return NextResponse.json(
        { error: "Delai depasse : le projet n'accepte plus de soumission (au-dela de la grace 24h)" },
        { status: 403 }
      );
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
      .select("question_id, answer_text, image_urls")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId);

    const answerMap = new Map<string, { text: string; hasImages: boolean }>();
    (answers || []).forEach((a) =>
      answerMap.set(a.question_id, {
        text: (a.answer_text || "").trim(),
        hasImages: Array.isArray(a.image_urls) && (a.image_urls as string[]).length > 0,
      })
    );

    const missingNoContent: string[] = [];
    const missingNoText: string[] = [];

    for (const q of questions) {
      const a = answerMap.get(q.id);
      if (!a || (!a.text && !a.hasImages)) {
        missingNoContent.push(q.id);
      } else if (!a.text) {
        // Cas du BUG #8 : l'utilisateur a fourni des images mais pas de commentaire ecrit.
        missingNoText.push(q.id);
      }
    }

    if (missingNoContent.length > 0 || missingNoText.length > 0) {
      const errorMessage =
        missingNoContent.length > 0
          ? "Toutes les questions doivent etre repondues"
          : "Un commentaire ecrit est requis pour chaque question, meme si vous avez ajoute des images";
      return NextResponse.json(
        {
          error: errorMessage,
          missing_question_ids: [...missingNoContent, ...missingNoText],
          missing_no_content: missingNoContent,
          missing_no_text: missingNoText,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    // G6 : transition atomique. Le filtre `.eq("status","in_progress")` empeche
    // un double clic / double tab de soumettre deux fois et de declencher deux
    // bonus de score via apply_score_change.
    const { data: updatedRows, error: updateErr } = await admin
      .from("project_testers")
      .update({
        status: "completed",
        submitted_at: now,
        completed_at: now,
      })
      .eq("id", pt.id)
      .eq("status", "in_progress")
      .select("id");

    if (updateErr) {
      console.error("[mission/submit] update err:", updateErr);
      return NextResponse.json({ error: "Erreur soumission" }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Mission deja soumise par une autre requete : on ne re-applique pas le bonus.
      return NextResponse.json(
        { error: "Mission deja soumise par une autre requete" },
        { status: 409 }
      );
    }

    // Bonus de score uniquement si la transition a effectivement eu lieu (G6).
    await admin.rpc("apply_score_change", {
      p_tester_id: authed.testerId,
      p_delta: 5,
      p_reason: "Soumission mission (en attente de validation staff)",
      p_project_id: projectId,
    });

    const testerEmail = (pt.tester as { email?: string } | null)?.email ?? null;
    await logStaffAction(
      {
        staff_id: null,
        staff_email: testerEmail,
        action: "mission.submitted",
        entity_type: "project_tester",
        entity_id: pt.id as string,
        metadata: {
          project_id: projectId,
          tester_id: authed.testerId,
          submitted_at_iso: now,
          answer_count: questions.length,
        },
      },
      request,
    );

    return NextResponse.json({ success: true, submitted_at: now });
  } catch (err) {
    console.error("[mission/submit] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
