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

  const { data, error } = await admin
    .from("project_use_cases")
    .select("*, use_case_success_criteria(*), project_questions(*)")
    .eq("project_id", id)
    .order("order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const useCases = (data ?? []).map((uc: Record<string, unknown>) => ({
    ...uc,
    criteria: Array.isArray(uc.use_case_success_criteria)
      ? (uc.use_case_success_criteria as Record<string, unknown>[]).sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            (a.order as number) - (b.order as number)
        )
      : [],
    questions: Array.isArray(uc.project_questions)
      ? (uc.project_questions as Record<string, unknown>[]).sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            (a.position as number) - (b.position as number)
        )
      : [],
    use_case_success_criteria: undefined,
    project_questions: undefined,
  }));

  return NextResponse.json(useCases);
}

export async function POST(
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
  const { title, task_wording, order, expected_testers_count, criteria, questions } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 });
  }

  const { data: uc, error } = await admin
    .from("project_use_cases")
    .insert({
      project_id: id,
      title: title.trim(),
      task_wording: task_wording?.trim() || null,
      order: order ?? 0,
      expected_testers_count: expected_testers_count ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (criteria && Array.isArray(criteria) && criteria.length > 0) {
    const rows = criteria.map((c: { label: string; is_primary?: boolean }, i: number) => ({
      use_case_id: uc.id,
      label: c.label,
      is_primary: c.is_primary ?? false,
      order: i,
    }));
    await admin.from("use_case_success_criteria").insert(rows);
  }

  if (questions && Array.isArray(questions) && questions.length > 0) {
    const rows = questions.map(
      (q: { question_text: string; question_hint?: string }, i: number) => ({
        project_id: id,
        use_case_id: uc.id,
        position: i,
        question_text: q.question_text,
        question_hint: q.question_hint || null,
      })
    );
    await admin.from("project_questions").insert(rows);
  }

  const { data: full } = await admin
    .from("project_use_cases")
    .select("*, use_case_success_criteria(*), project_questions(*)")
    .eq("id", uc.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}

export async function PUT(
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

  const { id: projectId } = await params;
  const body = await request.json();
  const useCases: Array<{
    id?: string;
    title: string;
    task_wording?: string;
    order: number;
    expected_testers_count?: number;
    criteria?: Array<{ id?: string; label: string; is_primary?: boolean; order: number }>;
    questions?: Array<{ id?: string; question_text: string; question_hint?: string; position: number }>;
  }> = body.use_cases;

  if (!Array.isArray(useCases)) {
    return NextResponse.json({ error: "use_cases requis" }, { status: 400 });
  }

  const existingUcIds = useCases.filter((uc) => uc.id).map((uc) => uc.id!);

  const { data: currentUcs } = await admin
    .from("project_use_cases")
    .select("id")
    .eq("project_id", projectId);

  const toDelete = (currentUcs ?? [])
    .map((u: { id: string }) => u.id)
    .filter((uid: string) => !existingUcIds.includes(uid));

  // Garde-fou : refuser la suppression d'un UC dont les questions ont deja recu des reponses.
  // La FK project_questions.use_case_id ON DELETE SET NULL preserve les questions,
  // mais l'utilisateur perdrait sa structure d'UC tout en laissant des questions orphelines.
  if (toDelete.length > 0) {
    const { data: ucQuestions } = await admin
      .from("project_questions")
      .select("id, use_case_id")
      .in("use_case_id", toDelete);

    const questionIds = (ucQuestions ?? []).map((q) => q.id);
    if (questionIds.length > 0) {
      const { count: answersCount } = await admin
        .from("project_tester_answers")
        .select("id", { count: "exact", head: true })
        .in("question_id", questionIds);

      if (answersCount && answersCount > 0) {
        return NextResponse.json(
          {
            error:
              "Impossible de supprimer un cas d'usage dont les questions ont deja recu des reponses.",
          },
          { status: 409 }
        );
      }

      // Aucune reponse : supprimer aussi explicitement les questions de ces UC pour eviter les orphelins.
      await admin.from("project_questions").delete().in("use_case_id", toDelete);
    }

    await admin.from("project_use_cases").delete().in("id", toDelete);
  }

  for (const uc of useCases) {
    let ucId: string;

    if (uc.id) {
      await admin
        .from("project_use_cases")
        .update({
          title: uc.title,
          task_wording: uc.task_wording || null,
          order: uc.order,
          expected_testers_count: uc.expected_testers_count ?? null,
        })
        .eq("id", uc.id);
      ucId = uc.id;
    } else {
      const { data: newUc } = await admin
        .from("project_use_cases")
        .insert({
          project_id: projectId,
          title: uc.title,
          task_wording: uc.task_wording || null,
          order: uc.order,
          expected_testers_count: uc.expected_testers_count ?? null,
        })
        .select()
        .single();
      ucId = newUc!.id;
    }

    if (uc.criteria !== undefined) {
      await admin.from("use_case_success_criteria").delete().eq("use_case_id", ucId);
      if (uc.criteria.length > 0) {
        const rows = uc.criteria.map((c, i) => ({
          use_case_id: ucId,
          label: c.label,
          is_primary: c.is_primary ?? false,
          order: i,
        }));
        await admin.from("use_case_success_criteria").insert(rows);
      }
    }

    if (uc.questions !== undefined) {
      // Diff base sur les ids pour preserver les reponses existantes.
      const { data: existingQs } = await admin
        .from("project_questions")
        .select("id")
        .eq("use_case_id", ucId);

      const existingIds = new Set((existingQs ?? []).map((q: { id: string }) => q.id));
      const incomingIds = new Set(
        uc.questions.filter((q) => q.id).map((q) => q.id as string)
      );
      const questionsToDelete = [...existingIds].filter((qid) => !incomingIds.has(qid));

      if (questionsToDelete.length > 0) {
        // Garde-fou : refuser de supprimer une question deja repondue.
        const { count: answersOnDeleted } = await admin
          .from("project_tester_answers")
          .select("id", { count: "exact", head: true })
          .in("question_id", questionsToDelete);

        if (answersOnDeleted && answersOnDeleted > 0) {
          return NextResponse.json(
            {
              error:
                "Impossible de supprimer une question : des reponses ont deja ete soumises pour celle-ci.",
            },
            { status: 409 }
          );
        }

        await admin.from("project_questions").delete().in("id", questionsToDelete);
      }

      // UPDATE des questions existantes, INSERT des nouvelles, en preservant l'ordre fourni.
      for (let i = 0; i < uc.questions.length; i++) {
        const q = uc.questions[i];
        if (q.id && existingIds.has(q.id)) {
          await admin
            .from("project_questions")
            .update({
              question_text: q.question_text,
              question_hint: q.question_hint || null,
              position: i,
            })
            .eq("id", q.id);
        } else {
          await admin.from("project_questions").insert({
            project_id: projectId,
            use_case_id: ucId,
            position: i,
            question_text: q.question_text,
            question_hint: q.question_hint || null,
          });
        }
      }
    }
  }

  const { data: result } = await admin
    .from("project_use_cases")
    .select("*, use_case_success_criteria(*), project_questions(*)")
    .eq("project_id", projectId)
    .order("order", { ascending: true });

  return NextResponse.json(result ?? []);
}
