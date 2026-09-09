import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeAge,
  computeDeviceSummary,
  GENDER_EXPORT_LABELS,
  DIGITAL_LEVEL_LABELS,
} from "@/lib/report-config";
import {
  selectReportPanel,
  describePanelSelection,
  scenarioResults,
  type SubmissionLike,
} from "@/lib/report-panel";

const IMAGES_BUCKET = "mission-images";
const IMAGE_URL_TTL = 60 * 60;

/**
 * GET /api/staff/projects/[id]/export?format=json|csv
 *
 * format=json  → donnees completes du rapport (vue /report/view)
 * format=csv   → annexe : reponses brutes anonymisees
 *
 * Regle unique (src/lib/report-panel.ts) : seules les participations
 * VALIDEES (soumises, notees >= 3, non baclees) entrent dans le panel, les
 * resultats par scenario, les verbatims et l'annexe. Un bug ou un verbatim
 * qui cite un testeur non valide est nettoye a l'export.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const [
    { data: useCases },
    { data: projectTesters },
    { data: report },
    { data: questions },
    { data: answers },
  ] = await Promise.all([
    admin.from("project_use_cases")
      .select("*, use_case_success_criteria(*)")
      .eq("project_id", projectId)
      .order("order"),
    admin.from("project_testers")
      .select("*, tester:testers(id, first_name, last_name, email, birth_date, gender, digital_level, devices, phone_model, mobile_os, browsers, connection, city, job_title, sector)")
      .eq("project_id", projectId)
      .order("created_at"),
    admin.from("project_reports")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle(),
    admin.from("project_questions")
      .select("id, position, question_text, question_type, use_case_id")
      .eq("project_id", projectId)
      .order("position"),
    admin.from("project_tester_answers")
      .select("tester_id, question_id, answer_text, image_urls, updated_at")
      .eq("project_id", projectId),
  ]);

  const panel = selectReportPanel((projectTesters ?? []) as (SubmissionLike & Record<string, unknown>)[]);
  const validPtIds = panel.validated.map((p) => p.id);

  const { data: completions } = validPtIds.length > 0
    ? await admin
        .from("use_case_completions")
        .select("project_tester_id, criterion_id, passed")
        .in("project_tester_id", validPtIds)
    : { data: [] as { project_tester_id: string; criterion_id: string; passed: boolean }[] };

  const qList = (questions ?? []) as { id: string; position: number; question_text: string; question_type: string; use_case_id: string | null }[];
  const aList = (answers ?? []) as { tester_id: string; question_id: string; answer_text: string | null; image_urls: string[] | null; updated_at: string | null }[];

  if (format === "csv") {
    return buildCsvResponse(panel.readableByTester, qList, aList, (useCases ?? []) as Record<string, unknown>[], project.title as string);
  }

  return buildJsonResponse(admin, project, (useCases ?? []) as Record<string, unknown>[], panel, qList, aList, completions ?? [], report);
}

async function buildJsonResponse(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  project: Record<string, unknown>,
  useCases: Record<string, unknown>[],
  panel: ReturnType<typeof selectReportPanel<SubmissionLike & Record<string, unknown>>>,
  questions: { id: string; position: number; question_text: string; question_type: string; use_case_id: string | null }[],
  answers: { tester_id: string; question_id: string; answer_text: string | null; image_urls: string[] | null }[],
  completions: { project_tester_id: string; criterion_id: string; passed: boolean }[],
  report: Record<string, unknown> | null,
) {
  const panelRows = panel.validated.map((pt) => {
    const t = pt.tester as Record<string, unknown> | null;
    if (!t) return null;
    return {
      readable_id: panel.readableByTester.get(t.id as string) ?? "?",
      gender: GENDER_EXPORT_LABELS[(t.gender as string) ?? ""] ?? "Non précisé",
      age: computeAge(t.birth_date as string | null),
      city: t.city ?? null,
      digital_level: DIGITAL_LEVEL_LABELS[(t.digital_level as string) ?? ""] ?? null,
      device_summary: computeDeviceSummary(t as { devices?: string[]; phone_model?: string | null; mobile_os?: string | null; browsers?: string[] }),
      job_title: t.job_title ?? null,
      sector: t.sector ?? null,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  const formattedUseCases = useCases.map((uc) => {
    const criteria = Array.isArray(uc.use_case_success_criteria)
      ? (uc.use_case_success_criteria as Record<string, unknown>[])
          .sort((a, b) => (a.order as number) - (b.order as number))
          .map((c) => ({ id: c.id as string, label: c.label as string, is_primary: c.is_primary as boolean }))
      : [];
    const uQuestions = questions
      .filter((q) => q.use_case_id === uc.id)
      .map((q) => ({ question_text: q.question_text, question_type: q.question_type }));
    const results = scenarioResults({ id: uc.id as string, criteria }, questions, answers, completions, panel);
    return {
      title: uc.title,
      task_wording: uc.task_wording ?? null,
      expected_testers_count: uc.expected_testers_count ?? null,
      criteria: criteria.map((c) => ({ label: c.label, is_primary: c.is_primary })),
      questions: uQuestions,
      results,
    };
  });

  // Taux global : moyenne des taux par scenario disposant d'un resultat.
  const rates = formattedUseCases.map((u) => u.results.primary_rate).filter((r): r is number => r !== null);
  const completion_rate = rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : null;

  const questionText = new Map(questions.map((q) => [q.id, q.question_text]));
  const reportContent = report ? {
    delivery_date: report.delivery_date,
    summary: report.summary,
    bugs: translateTesterIds(report.bugs, panel.readableByTester),
    frictions: await translateVerbatims(admin, report.frictions, panel.readableByTester, questionText),
    recommendations: report.recommendations,
    impact_effort_matrix: report.impact_effort_matrix,
  } : null;

  const payload = {
    _meta: {
      exported_at: new Date().toISOString(),
      format_version: "1.1",
      panel_selection: { ...panel.counts, note: describePanelSelection(panel.counts) },
    },
    project: {
      title: project.title,
      company_name: project.company_name,
      sector: project.sector,
      start_date: project.start_date,
      end_date: project.end_date,
      business_objective: project.business_objective ?? null,
      scope_included: project.scope_included ?? [],
      scope_excluded: project.scope_excluded ?? [],
      client_guidelines: project.client_guidelines ?? null,
      test_type: project.test_type ?? "unmoderated",
      audit_enabled: project.audit_enabled ?? false,
      ...(project.audit_enabled ? {
        audit_scores: {
          performance: project.audit_performance_score ?? null,
          accessibility: project.audit_accessibility_score ?? null,
          seo: project.audit_seo_score ?? null,
          best_practices: project.audit_best_practices_score ?? null,
        },
        audit_findings: project.audit_findings ?? [],
      } : {}),
    },
    panel: panelRows,
    panel_stats: {
      total: panelRows.length,
      assigned: panel.counts.assigned,
      excluded_note: describePanelSelection(panel.counts),
      completion_rate,
      avg_age: avgAge(panelRows),
      gender_distribution: genderDist(panelRows),
      digital_level_distribution: digitalDist(panelRows),
    },
    use_cases: formattedUseCases,
    report: reportContent,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="rapport-${slugify(project.title as string)}.json"`,
    },
  });
}

function buildCsvResponse(
  readableByTester: Map<string, string>,
  questions: { id: string; question_text: string; use_case_id: string | null }[],
  answers: { tester_id: string; question_id: string; answer_text: string | null; image_urls: string[] | null; updated_at: string | null }[],
  useCases: Record<string, unknown>[],
  projectTitle: string,
) {
  const ucMap = new Map<string, string>();
  useCases.forEach((uc) => { ucMap.set(uc.id as string, uc.title as string); });

  const questionMeta = new Map<string, { text: string; ucTitle: string }>();
  questions.forEach((q) => {
    questionMeta.set(q.id, { text: q.question_text, ucTitle: (q.use_case_id && ucMap.get(q.use_case_id)) || "Questions libres" });
  });

  const rows: string[][] = [
    ["tester_id", "cas_usage", "question", "reponse", "captures", "date"],
  ];

  // Annexe : uniquement les participations validees (promesse client).
  for (const a of answers) {
    const readableId = readableByTester.get(a.tester_id);
    if (!readableId) continue;
    const qm = questionMeta.get(a.question_id);
    rows.push([
      readableId,
      qm?.ucTitle ?? "",
      qm?.text ?? "",
      String(a.answer_text ?? "").replace(/"/g, '""'),
      String((a.image_urls ?? []).length),
      a.updated_at ? new Date(a.updated_at).toISOString() : "",
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reponses-${slugify(projectTitle)}.csv"`,
    },
  });
}

/* --- helpers --- */

/** Bugs : traduit les testeurs affectes en T0n et ecarte ceux hors panel. */
function translateTesterIds(bugs: unknown, readableByTester: Map<string, string>) {
  if (!Array.isArray(bugs)) return bugs;
  return bugs.map((b: Record<string, unknown>) => ({
    ...b,
    affected_testers_readable: Array.isArray(b.affected_testers)
      ? (b.affected_testers as string[]).map((id) => readableByTester.get(id)).filter((x): x is string => !!x)
      : [],
  }));
}

/**
 * Verbatims : T0n, question d'origine, captures en URLs signees 1 h. Un
 * verbatim d'un testeur hors panel (refuse apres coup) est retire.
 */
async function translateVerbatims(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  frictions: unknown,
  readableByTester: Map<string, string>,
  questionText: Map<string, string>,
) {
  if (!Array.isArray(frictions)) return frictions;
  const out = [];
  for (const f of frictions as Record<string, unknown>[]) {
    const verbatims = [];
    for (const v of (Array.isArray(f.verbatims) ? f.verbatims : []) as Record<string, unknown>[]) {
      const testerId = v.tester_id as string | undefined;
      const readable = testerId ? readableByTester.get(testerId) : undefined;
      if (testerId && !readable) continue;
      const paths = Array.isArray(v.image_paths) ? (v.image_paths as string[]) : [];
      const images = await Promise.all(paths.map(async (p) => {
        const { data } = await admin.storage.from(IMAGES_BUCKET).createSignedUrl(p, IMAGE_URL_TTL);
        return data?.signedUrl ?? null;
      }));
      verbatims.push({
        text: v.text,
        tester_id: testerId ?? null,
        tester_readable: readable ?? null,
        question_text: (v.question_text as string | undefined)
          ?? (typeof v.question_id === "string" ? questionText.get(v.question_id) ?? null : null),
        images: images.filter((u): u is string => !!u),
      });
    }
    out.push({ ...f, verbatims });
  }
  return out;
}

function avgAge(panel: { age: number | null }[]): number | null {
  const ages = panel.map((p) => p.age).filter((a): a is number => a !== null);
  if (ages.length === 0) return null;
  return Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);
}

function genderDist(panel: { gender: string }[]): Record<string, number> {
  const dist: Record<string, number> = {};
  panel.forEach((p) => { dist[p.gender] = (dist[p.gender] ?? 0) + 1; });
  return dist;
}

function digitalDist(panel: { digital_level: string | null }[]): Record<string, number> {
  const dist: Record<string, number> = {};
  panel.forEach((p) => { const k = p.digital_level ?? "Non renseigné"; dist[k] = (dist[k] ?? 0) + 1; });
  return dist;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "rapport";
}
