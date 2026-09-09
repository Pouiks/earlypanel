/**
 * Panel du rapport client et agregats par scenario.
 *
 * Regle unique, promise sur la page d'accueil : seules les participations
 * VALIDEES par le staff entrent dans le rapport (panel, verbatims,
 * resultats, annexe CSV). Validee = mission soumise (status 'completed'),
 * notee >= 3 et non bacle (migration 045). C'est exactement la regle qui
 * declenche le paiement et le maintien de missions_completed (migration
 * 032) : ce qui est paye est compte, ce qui est refuse ne l'est pas.
 *
 * Identifiants lisibles T01, T02… : attribues parmi les participations
 * validees, dans l'ordre de soumission. Ils sont donc stables tant que la
 * liste des validees ne change pas.
 *
 * Fonctions pures, testees dans tests/unit/report-panel.test.ts.
 */
import { computeReadableTesterId } from "@/lib/report-config";

export interface SubmissionLike {
  id: string;
  tester_id: string;
  status: string;
  staff_rating?: number | null;
  staff_sloppy?: boolean | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

/** Note minimale pour qu'une participation soit comptee (cf. migration 032). */
export const VALIDATED_MIN_RATING = 3;

export function isValidatedSubmission(pt: SubmissionLike): boolean {
  return (
    pt.status === "completed" &&
    typeof pt.staff_rating === "number" &&
    pt.staff_rating >= VALIDATED_MIN_RATING &&
    pt.staff_sloppy !== true
  );
}

export type ExclusionReason = "not_submitted" | "not_rated" | "rejected";

/** Pourquoi une participation n'entre pas dans le rapport. `null` = validee. */
export function exclusionReason(pt: SubmissionLike): ExclusionReason | null {
  if (pt.status !== "completed") return "not_submitted";
  if (typeof pt.staff_rating !== "number") return "not_rated";
  if (pt.staff_sloppy === true || pt.staff_rating < VALIDATED_MIN_RATING) return "rejected";
  return null;
}

export interface PanelSelection<T extends SubmissionLike> {
  /** Participations validees, ordre de soumission. */
  validated: T[];
  /** tester_id → T01… */
  readableByTester: Map<string, string>;
  /** project_tester.id → T01… */
  readableByPt: Map<string, string>;
  counts: { assigned: number; validated: number; not_submitted: number; not_rated: number; rejected: number };
}

export function selectReportPanel<T extends SubmissionLike>(pts: T[]): PanelSelection<T> {
  const counts = { assigned: pts.length, validated: 0, not_submitted: 0, not_rated: 0, rejected: 0 };
  const validated: T[] = [];
  for (const pt of pts) {
    const reason = exclusionReason(pt);
    if (reason) counts[reason]++;
    else validated.push(pt);
  }
  validated.sort((a, b) => {
    const ka = a.submitted_at ?? a.created_at ?? "";
    const kb = b.submitted_at ?? b.created_at ?? "";
    return ka < kb ? -1 : ka > kb ? 1 : a.id < b.id ? -1 : 1;
  });
  counts.validated = validated.length;
  const readableByTester = new Map<string, string>();
  const readableByPt = new Map<string, string>();
  validated.forEach((pt, i) => {
    const rid = computeReadableTesterId(i);
    readableByTester.set(pt.tester_id, rid);
    readableByPt.set(pt.id, rid);
  });
  return { validated, readableByTester, readableByPt, counts };
}

/** Phrase de transparence pour le rapport (ne cite jamais de nom). */
export function describePanelSelection(c: PanelSelection<SubmissionLike>["counts"]): string | null {
  const excluded = c.not_submitted + c.not_rated + c.rejected;
  if (excluded === 0) return null;
  const parts: string[] = [];
  if (c.not_submitted > 0) parts.push(`${c.not_submitted} non terminée${c.not_submitted > 1 ? "s" : ""}`);
  if (c.rejected > 0) parts.push(`${c.rejected} refusée${c.rejected > 1 ? "s" : ""} après relecture`);
  if (c.not_rated > 0) parts.push(`${c.not_rated} en cours de relecture`);
  return `${excluded} participation${excluded > 1 ? "s" : ""} non comptabilisée${excluded > 1 ? "s" : ""} (${parts.join(", ")}).`;
}

// ---------------------------------------------------------------------
// Questions fermees (binary : yes/no/partial ; scale_1_5 : "1".."5")
// ---------------------------------------------------------------------

export interface ClosedQuestionResult {
  question_id: string;
  question_text: string;
  question_type: "binary" | "scale_1_5";
  answered: number;
  /** binary uniquement */
  yes?: number;
  no?: number;
  partial?: number;
  /** scale_1_5 uniquement */
  average?: number | null;
  distribution?: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export function aggregateClosedQuestion(
  q: { id: string; question_text: string; question_type: string },
  answers: { tester_id: string; question_id: string; answer_text: string | null }[],
  validTesterIds: Set<string>,
): ClosedQuestionResult | null {
  if (q.question_type !== "binary" && q.question_type !== "scale_1_5") return null;
  const mine = answers.filter((a) => a.question_id === q.id && validTesterIds.has(a.tester_id));
  if (q.question_type === "binary") {
    let yes = 0, no = 0, partial = 0;
    for (const a of mine) {
      const v = String(a.answer_text ?? "").trim().toLowerCase();
      if (v === "yes") yes++;
      else if (v === "no") no++;
      else if (v === "partial") partial++;
    }
    return { question_id: q.id, question_text: q.question_text, question_type: "binary", answered: yes + no + partial, yes, no, partial };
  }
  const distribution: Record<"1" | "2" | "3" | "4" | "5", number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let sum = 0, n = 0;
  for (const a of mine) {
    const v = String(a.answer_text ?? "").trim();
    if (v === "1" || v === "2" || v === "3" || v === "4" || v === "5") {
      distribution[v]++;
      sum += Number(v);
      n++;
    }
  }
  return {
    question_id: q.id, question_text: q.question_text, question_type: "scale_1_5",
    answered: n, average: n > 0 ? Math.round((sum / n) * 10) / 10 : null, distribution,
  };
}

// ---------------------------------------------------------------------
// Resultats par scenario (criteres de succes enregistres par le staff)
// ---------------------------------------------------------------------

export interface CriterionResult {
  id: string;
  label: string;
  is_primary: boolean;
  passed: number;
  /** Nombre de participations validees pour lesquelles le critere a ete renseigne. */
  recorded: number;
}

export interface ScenarioResults {
  testers: number;
  primary: CriterionResult | null;
  /** % de validees ayant reussi le critere principal, null si rien d'enregistre. */
  primary_rate: number | null;
  criteria: CriterionResult[];
  closed_questions: ClosedQuestionResult[];
}

export function scenarioResults(
  uc: { id: string; criteria: { id: string; label: string; is_primary: boolean }[] },
  questions: { id: string; question_text: string; question_type: string; use_case_id: string | null }[],
  answers: { tester_id: string; question_id: string; answer_text: string | null }[],
  completions: { project_tester_id: string; criterion_id: string; passed: boolean }[],
  panel: PanelSelection<SubmissionLike>,
): ScenarioResults {
  const validPtIds = new Set(panel.validated.map((p) => p.id));
  const validTesterIds = new Set(panel.validated.map((p) => p.tester_id));
  const testers = panel.validated.length;

  const criteria: CriterionResult[] = uc.criteria.map((c) => {
    const mine = completions.filter((x) => x.criterion_id === c.id && validPtIds.has(x.project_tester_id));
    return { id: c.id, label: c.label, is_primary: c.is_primary, passed: mine.filter((x) => x.passed).length, recorded: mine.length };
  });
  const primary = criteria.find((c) => c.is_primary) ?? null;
  const primary_rate = primary && primary.recorded > 0 && testers > 0
    ? Math.round((100 * primary.passed) / testers)
    : null;

  const closed_questions = questions
    .filter((q) => q.use_case_id === uc.id)
    .map((q) => aggregateClosedQuestion(q, answers, validTesterIds))
    .filter((r): r is ClosedQuestionResult => r !== null && r.answered > 0);

  return { testers, primary, primary_rate, criteria, closed_questions };
}
