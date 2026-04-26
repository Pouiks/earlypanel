import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;

  const { data: project, error } = await admin
    .from("projects")
    .select("*, project_questions(*)")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  if (project.project_questions) {
    project.project_questions.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { questions, ...projectData } = body;

  if (Object.keys(projectData).length > 0) {
    // Garde-fou : ne pas autoriser un retour vers "draft" si des testeurs ont deja avance.
    if ("status" in projectData && projectData.status === "draft") {
      const { count: activePtCount } = await admin
        .from("project_testers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id)
        .neq("status", "selected");

      if (activePtCount && activePtCount > 0) {
        return NextResponse.json(
          {
            error:
              "Impossible de repasser le projet en brouillon : des testeurs ont deja avance dans le workflow.",
          },
          { status: 409 }
        );
      }
    }

    if ("start_date" in projectData || "end_date" in projectData) {
      const { data: existing } = await admin
        .from("projects")
        .select("start_date, end_date")
        .eq("id", id)
        .single();

      const start =
        projectData.start_date !== undefined
          ? projectData.start_date
          : existing?.start_date;
      const end =
        projectData.end_date !== undefined
          ? projectData.end_date
          : existing?.end_date;

      if (!start || !end) {
        return NextResponse.json(
          { error: "start_date et end_date sont obligatoires" },
          { status: 400 }
        );
      }
      const startT = new Date(start as string);
      const endT = new Date(end as string);
      if (isNaN(startT.getTime()) || isNaN(endT.getTime())) {
        return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
      }
      if (endT <= startT) {
        return NextResponse.json(
          { error: "end_date doit être après start_date" },
          { status: 400 }
        );
      }
    }

    const { error } = await admin
      .from("projects")
      .update(projectData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (questions !== undefined && Array.isArray(questions)) {
    // Garde-fou critique : la FK project_tester_answers.question_id ON DELETE CASCADE
    // detruirait toutes les reponses si on supprime les questions.
    const { count: answersCount } = await admin
      .from("project_tester_answers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    if (answersCount && answersCount > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de modifier les questions : des reponses ont deja ete soumises. Utilisez la gestion des cas d'usage pour des modifications ciblees.",
        },
        { status: 409 }
      );
    }

    // Si le projet utilise des cas d'usage, refuser pour eviter d'orpheliner les questions.
    const { count: ucQuestionsCount } = await admin
      .from("project_questions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .not("use_case_id", "is", null);

    if (ucQuestionsCount && ucQuestionsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Ce projet utilise des cas d'usage. Modifiez les questions via la gestion des use cases.",
        },
        { status: 409 }
      );
    }

    await admin
      .from("project_questions")
      .delete()
      .eq("project_id", id);

    if (questions.length > 0) {
      const questionRows = questions.map((q: { question_text: string }, i: number) => ({
        project_id: id,
        position: i,
        question_text: q.question_text,
      }));

      await admin.from("project_questions").insert(questionRows);
    }
  }

  const { data: updated } = await admin
    .from("projects")
    .select("*, project_questions(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;

  // Garde-fou : refuser la suppression si des testeurs ont commence le projet.
  // On autorise la suppression d'un brouillon avec uniquement des "selected" (rien n'a ete envoye).
  const { count: activePtCount } = await admin
    .from("project_testers")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .neq("status", "selected");

  if (activePtCount && activePtCount > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${activePtCount} testeur(s) ont deja participe a ce projet. Archivez-le plutot.`,
      },
      { status: 409 }
    );
  }

  // Refuser aussi la suppression d'un projet qui a deja eu des paiements.
  const { count: payoutCount } = await admin
    .from("tester_payouts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  if (payoutCount && payoutCount > 0) {
    return NextResponse.json(
      {
        error: "Impossible de supprimer : des versements existent pour ce projet. Archivez-le plutot.",
      },
      { status: 409 }
    );
  }

  const { error } = await admin
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
