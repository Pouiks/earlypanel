import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterWorkWithGrace } from "@/lib/project-lifecycle";

/**
 * PUT : upsert d'une reponse texte pour une question.
 * Body : { question_id: string, answer_text: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;
    const body = await request.json();
    const questionId = body?.question_id as string | undefined;
    const answerText = (body?.answer_text ?? "") as string;

    if (!questionId) {
      return NextResponse.json({ error: "question_id requis" }, { status: 400 });
    }
    if (typeof answerText !== "string") {
      return NextResponse.json({ error: "answer_text invalide" }, { status: 400 });
    }
    if (answerText.length > 10000) {
      return NextResponse.json({ error: "Reponse trop longue (max 10000)" }, { status: 400 });
    }

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .maybeSingle();

    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (pt.status !== "in_progress") {
      return NextResponse.json(
        { error: "La mission doit être démarrée et non soumise" },
        { status: 409 }
      );
    }

    const { data: project } = await admin
      .from("projects")
      .select("end_date, status")
      .eq("id", projectId)
      .single();

    // On accorde une fenetre de grace de 24h apres end_date pour ne pas perdre le brouillon
    // d'un testeur en cours quand le cron `close-expired` ferme le projet en cours de route.
    if (
      !projectAllowsTesterWorkWithGrace(
        project?.status as string,
        (project?.end_date as string | null) ?? null
      )
    ) {
      return NextResponse.json(
        { error: "Le projet n'est plus ouvert aux modifications (delai depasse au-dela de la grace)" },
        { status: 403 }
      );
    }

    const { data: question } = await admin
      .from("project_questions")
      .select("id")
      .eq("id", questionId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (!question) {
      return NextResponse.json({ error: "Question invalide" }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("project_tester_answers")
      .select("id, image_urls")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("project_tester_answers")
        .update({ answer_text: answerText })
        .eq("id", existing.id);
      if (error) {
        console.error("[answers] update err:", error);
        return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
      }
    } else {
      const { error } = await admin
        .from("project_tester_answers")
        .insert({
          project_id: projectId,
          tester_id: authed.testerId,
          question_id: questionId,
          answer_text: answerText,
          image_urls: [],
        });
      if (error) {
        console.error("[answers] insert err:", error);
        return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[answers] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
