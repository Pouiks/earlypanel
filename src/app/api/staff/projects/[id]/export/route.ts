import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeReadableTesterId,
  computeAge,
  computeDeviceSummary,
  GENDER_EXPORT_LABELS,
  DIGITAL_LEVEL_LABELS,
} from "@/lib/report-config";

/**
 * GET /api/staff/projects/[id]/export?format=json|csv
 *
 * format=json  → Export JSON complet pour le skill Claude (génération PDF)
 * format=csv   → Export CSV des réponses brutes anonymisées (annexe)
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
  ] = await Promise.all([
    admin.from("project_use_cases")
      .select("*, use_case_success_criteria(*), project_questions(*)")
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
      .select("id, position, question_text, use_case_id")
      .eq("project_id", projectId)
      .order("position"),
  ]);

  const testerMap = new Map<string, string>();
  (projectTesters ?? []).forEach((pt: { tester: { id: string } | null }, i: number) => {
    if (pt.tester) testerMap.set(pt.tester.id, computeReadableTesterId(i));
  });

  if (format === "csv") {
    return buildCsvResponse(projectTesters ?? [], questions ?? [], useCases ?? [], testerMap, admin, projectId, project.title);
  }

  return buildJsonResponse(project, useCases ?? [], projectTesters ?? [], report, testerMap);
}

function buildJsonResponse(
  project: Record<string, unknown>,
  useCases: Record<string, unknown>[],
  projectTesters: Record<string, unknown>[],
  report: Record<string, unknown> | null,
  testerMap: Map<string, string>,
) {
  const panel = projectTesters.map((pt) => {
    const t = pt.tester as Record<string, unknown> | null;
    if (!t) return null;
    return {
      readable_id: testerMap.get(t.id as string) ?? "?",
      gender: GENDER_EXPORT_LABELS[(t.gender as string) ?? ""] ?? "—",
      age: computeAge(t.birth_date as string | null),
      city: t.city ?? null,
      digital_level: DIGITAL_LEVEL_LABELS[(t.digital_level as string) ?? ""] ?? null,
      device_summary: computeDeviceSummary(t as { devices?: string[]; phone_model?: string | null; mobile_os?: string | null; browsers?: string[] }),
      job_title: t.job_title ?? null,
      sector: t.sector ?? null,
    };
  }).filter(Boolean);

  const formattedUseCases = useCases.map((uc) => {
    const criteria = Array.isArray(uc.use_case_success_criteria)
      ? (uc.use_case_success_criteria as Record<string, unknown>[])
          .sort((a, b) => (a.order as number) - (b.order as number))
          .map((c) => ({
            label: c.label,
            is_primary: c.is_primary,
          }))
      : [];
    const uQuestions = Array.isArray(uc.project_questions)
      ? (uc.project_questions as Record<string, unknown>[])
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((q) => ({ question_text: q.question_text }))
      : [];
    return {
      title: uc.title,
      task_wording: uc.task_wording ?? null,
      expected_testers_count: uc.expected_testers_count ?? null,
      criteria,
      questions: uQuestions,
    };
  });

  const reportContent = report ? {
    delivery_date: report.delivery_date,
    summary: report.summary,
    bugs: translateTesterIds(report.bugs, testerMap),
    frictions: translateVerbatimIds(report.frictions, testerMap),
    recommendations: report.recommendations,
    impact_effort_matrix: report.impact_effort_matrix,
  } : null;

  const payload = {
    _meta: {
      exported_at: new Date().toISOString(),
      format_version: "1.0",
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
    panel,
    panel_stats: {
      total: panel.length,
      avg_age: avgAge(panel),
      gender_distribution: genderDist(panel),
      digital_level_distribution: digitalDist(panel),
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

async function buildCsvResponse(
  projectTesters: Record<string, unknown>[],
  questions: Record<string, unknown>[],
  useCases: Record<string, unknown>[],
  testerMap: Map<string, string>,
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  projectTitle: string,
) {
  if (!admin) {
    return new NextResponse("Erreur serveur", { status: 500 });
  }

  const ucMap = new Map<string, string>();
  useCases.forEach((uc) => { ucMap.set(uc.id as string, uc.title as string); });

  const questionMeta = new Map<string, { text: string; ucTitle: string }>();
  questions.forEach((q) => {
    questionMeta.set(q.id as string, {
      text: q.question_text as string,
      ucTitle: ucMap.get(q.use_case_id as string) ?? "Questions libres",
    });
  });

  const { data: answers } = await admin
    .from("project_tester_answers")
    .select("tester_id, question_id, answer_text, updated_at")
    .eq("project_id", projectId);

  const rows: string[][] = [
    ["tester_id", "cas_usage", "question", "reponse", "date"],
  ];

  for (const a of (answers ?? []) as Record<string, unknown>[]) {
    const readableId = testerMap.get(a.tester_id as string) ?? "?";
    const qm = questionMeta.get(a.question_id as string);
    rows.push([
      readableId,
      qm?.ucTitle ?? "",
      qm?.text ?? "",
      String(a.answer_text ?? "").replace(/"/g, '""'),
      a.updated_at ? new Date(a.updated_at as string).toISOString() : "",
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

function translateTesterIds(bugs: unknown, testerMap: Map<string, string>) {
  if (!Array.isArray(bugs)) return bugs;
  return bugs.map((b: Record<string, unknown>) => ({
    ...b,
    affected_testers_readable: Array.isArray(b.affected_testers)
      ? (b.affected_testers as string[]).map((id) => testerMap.get(id) ?? id)
      : [],
  }));
}

function translateVerbatimIds(frictions: unknown, testerMap: Map<string, string>) {
  if (!Array.isArray(frictions)) return frictions;
  return frictions.map((f: Record<string, unknown>) => ({
    ...f,
    verbatims: Array.isArray(f.verbatims)
      ? (f.verbatims as Record<string, unknown>[]).map((v) => ({
          ...v,
          tester_readable: testerMap.get(v.tester_id as string) ?? v.tester_id,
        }))
      : [],
  }));
}

function avgAge(panel: ({ age: number | null } | null)[]): number | null {
  const ages = panel.filter(Boolean).map((p) => p!.age).filter((a): a is number => a !== null);
  if (ages.length === 0) return null;
  return Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);
}

function genderDist(panel: ({ gender: string } | null)[]): Record<string, number> {
  const dist: Record<string, number> = {};
  panel.filter(Boolean).forEach((p) => { dist[p!.gender] = (dist[p!.gender] ?? 0) + 1; });
  return dist;
}

function digitalDist(panel: ({ digital_level: string | null } | null)[]): Record<string, number> {
  const dist: Record<string, number> = {};
  panel.filter(Boolean).forEach((p) => {
    const lv = p!.digital_level ?? "Non renseigné";
    dist[lv] = (dist[lv] ?? 0) + 1;
  });
  return dist;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}
