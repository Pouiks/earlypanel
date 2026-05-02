import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type QuestionType = "text" | "binary" | "scale_1_5";
const VALID_TYPES: QuestionType[] = ["text", "binary", "scale_1_5"];
const VALID_BINARY_VALUES = ["yes", "no", "partial"];

interface IncomingQuestion {
  id?: string;
  question_text: string;
  question_hint?: string | null;
  position: number;
  question_type?: QuestionType;
  /** Position (dans le meme UC) de la question parent. null = pas de parent. */
  parent_position?: number | null;
  parent_show_when_values?: string[] | null;
  min_chars_hint?: number | null;
}

interface IncomingUseCase {
  id?: string;
  title: string;
  task_wording?: string;
  order: number;
  expected_testers_count?: number;
  criteria?: Array<{ id?: string; label: string; is_primary?: boolean; order: number }>;
  questions?: IncomingQuestion[];
}

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
      (q: IncomingQuestion, i: number) => ({
        project_id: id,
        use_case_id: uc.id,
        position: i,
        question_text: q.question_text,
        question_hint: q.question_hint || null,
        question_type: VALID_TYPES.includes(q.question_type ?? "text") ? q.question_type ?? "text" : "text",
        min_chars_hint: q.min_chars_hint ?? null,
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
  const useCases: IncomingUseCase[] = body.use_cases;

  if (!Array.isArray(useCases)) {
    return NextResponse.json({ error: "use_cases requis" }, { status: 400 });
  }

  // Validation prealable des questions conditionnelles. On le fait avant
  // toute mutation pour eviter de partir en transaction et echouer au milieu.
  for (const uc of useCases) {
    const qs = uc.questions ?? [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (q.question_type && !VALID_TYPES.includes(q.question_type)) {
        return NextResponse.json(
          { error: `Type de question invalide : ${q.question_type}` },
          { status: 400 }
        );
      }
      if (q.parent_position !== null && q.parent_position !== undefined) {
        if (q.parent_position < 0 || q.parent_position >= i) {
          return NextResponse.json(
            { error: "Une question conditionnelle doit referencer un parent situe avant elle dans le meme cas d'usage." },
            { status: 400 }
          );
        }
        const parent = qs[q.parent_position];
        if (parent.question_type !== "binary") {
          return NextResponse.json(
            { error: "Seule une question de type 'binary' peut etre parent d'une question conditionnelle." },
            { status: 400 }
          );
        }
        if (q.parent_show_when_values && q.parent_show_when_values.length > 0) {
          const invalid = q.parent_show_when_values.filter((v) => !VALID_BINARY_VALUES.includes(v));
          if (invalid.length > 0) {
            return NextResponse.json(
              { error: `Valeur(s) parent_show_when_values invalides : ${invalid.join(", ")}` },
              { status: 400 }
            );
          }
        }
      }
      if (q.min_chars_hint !== null && q.min_chars_hint !== undefined && q.min_chars_hint <= 0) {
        return NextResponse.json(
          { error: "min_chars_hint doit etre > 0 ou null" },
          { status: 400 }
        );
      }
    }
  }

  const existingUcIds = useCases.filter((uc) => uc.id).map((uc) => uc.id!);

  const { data: currentUcs } = await admin
    .from("project_use_cases")
    .select("id")
    .eq("project_id", projectId);

  const toDelete = (currentUcs ?? [])
    .map((u: { id: string }) => u.id)
    .filter((uid: string) => !existingUcIds.includes(uid));

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

        // SET NULL en cascade avant DELETE pour que les enfants ne pointent
        // pas dans le vide (ON DELETE SET NULL le ferait deja, mais on rend
        // l'intention explicite).
        await admin
          .from("project_questions")
          .update({ parent_question_id: null, parent_show_when_values: null })
          .in("parent_question_id", questionsToDelete);

        await admin.from("project_questions").delete().in("id", questionsToDelete);
      }

      // Pass 1 : UPDATE/INSERT et collecte des ids par position pour resoudre les parents.
      const positionToId: string[] = [];
      for (let i = 0; i < uc.questions.length; i++) {
        const q = uc.questions[i];
        const qType = VALID_TYPES.includes(q.question_type ?? "text") ? q.question_type ?? "text" : "text";
        const minHint = q.min_chars_hint ?? null;

        if (q.id && existingIds.has(q.id)) {
          await admin
            .from("project_questions")
            .update({
              question_text: q.question_text,
              question_hint: q.question_hint || null,
              position: i,
              question_type: qType,
              min_chars_hint: minHint,
              // Reset des champs conditionnels : seront re-positionnes en pass 2.
              parent_question_id: null,
              parent_show_when_values: null,
            })
            .eq("id", q.id);
          positionToId[i] = q.id;
        } else {
          const { data: newQ, error: qErr } = await admin
            .from("project_questions")
            .insert({
              project_id: projectId,
              use_case_id: ucId,
              position: i,
              question_text: q.question_text,
              question_hint: q.question_hint || null,
              question_type: qType,
              min_chars_hint: minHint,
            })
            .select()
            .single();
          if (qErr || !newQ) {
            return NextResponse.json(
              { error: qErr?.message || "Erreur insertion question" },
              { status: 500 }
            );
          }
          positionToId[i] = newQ.id;
        }
      }

      // Pass 2 : pour chaque question conditionnelle, on resoud parent_position -> id
      // et on met a jour parent_question_id + parent_show_when_values.
      for (let i = 0; i < uc.questions.length; i++) {
        const q = uc.questions[i];
        if (q.parent_position === null || q.parent_position === undefined) continue;
        const parentId = positionToId[q.parent_position];
        if (!parentId) continue;
        const showWhen = (q.parent_show_when_values ?? []).filter((v) => VALID_BINARY_VALUES.includes(v));
        await admin
          .from("project_questions")
          .update({
            parent_question_id: parentId,
            parent_show_when_values: showWhen.length > 0 ? showWhen : null,
          })
          .eq("id", positionToId[i]);
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
