import { describe, it, expect } from "vitest";
import {
  isValidatedSubmission,
  exclusionReason,
  selectReportPanel,
  describePanelSelection,
  aggregateClosedQuestion,
  scenarioResults,
} from "@/lib/report-panel";

const pt = (over: Partial<Parameters<typeof isValidatedSubmission>[0]> & { id: string }) => ({
  tester_id: `t-${over.id}`,
  status: "completed",
  staff_rating: 4,
  staff_sloppy: false,
  submitted_at: "2026-09-01T10:00:00.000Z",
  ...over,
});

describe("isValidatedSubmission / exclusionReason — promesse « refusé = non comptabilisé »", () => {
  it("soumise, notée ≥ 3, non bâclée → validée", () => {
    expect(isValidatedSubmission(pt({ id: "a" }))).toBe(true);
    expect(isValidatedSubmission(pt({ id: "a", staff_rating: 3 }))).toBe(true);
    expect(exclusionReason(pt({ id: "a" }))).toBeNull();
  });
  it("non soumise (in_progress, nda_signed…) → not_submitted", () => {
    expect(exclusionReason(pt({ id: "a", status: "in_progress" }))).toBe("not_submitted");
    expect(exclusionReason(pt({ id: "a", status: "nda_sent", staff_rating: null }))).toBe("not_submitted");
  });
  it("soumise mais pas encore notée → not_rated", () => {
    expect(exclusionReason(pt({ id: "a", staff_rating: null }))).toBe("not_rated");
    expect(exclusionReason(pt({ id: "a", staff_rating: undefined }))).toBe("not_rated");
  });
  it("bâclée ou notée < 3 → rejected (même règle que le paiement, migration 032)", () => {
    expect(exclusionReason(pt({ id: "a", staff_sloppy: true, staff_rating: 4 }))).toBe("rejected");
    expect(exclusionReason(pt({ id: "a", staff_rating: 2 }))).toBe("rejected");
  });
});

describe("selectReportPanel — T01… parmi les validées, ordre de soumission", () => {
  it("filtre, trie et numérote", () => {
    const sel = selectReportPanel([
      pt({ id: "late", submitted_at: "2026-09-03T10:00:00.000Z" }),
      pt({ id: "rejected", staff_sloppy: true }),
      pt({ id: "early", submitted_at: "2026-09-01T10:00:00.000Z" }),
      pt({ id: "wip", status: "in_progress", staff_rating: null }),
      pt({ id: "unrated", staff_rating: null }),
    ]);
    expect(sel.validated.map((p) => p.id)).toEqual(["early", "late"]);
    expect(sel.readableByTester.get("t-early")).toBe("T01");
    expect(sel.readableByTester.get("t-late")).toBe("T02");
    expect(sel.readableByPt.get("late")).toBe("T02");
    expect(sel.readableByTester.has("t-rejected")).toBe(false);
    expect(sel.counts).toEqual({ assigned: 5, validated: 2, not_submitted: 1, not_rated: 1, rejected: 1 });
  });
  it("phrase de transparence, null si rien d'exclu", () => {
    expect(describePanelSelection({ assigned: 3, validated: 3, not_submitted: 0, not_rated: 0, rejected: 0 })).toBeNull();
    expect(describePanelSelection({ assigned: 5, validated: 2, not_submitted: 1, not_rated: 1, rejected: 1 }))
      .toBe("3 participations non comptabilisées (1 non terminée, 1 refusée après relecture, 1 en cours de relecture).");
    expect(describePanelSelection({ assigned: 4, validated: 3, not_submitted: 0, not_rated: 0, rejected: 1 }))
      .toBe("1 participation non comptabilisée (1 refusée après relecture).");
  });
});

describe("aggregateClosedQuestion", () => {
  const valid = new Set(["t1", "t2", "t3"]);
  it("binary : compte oui / non / partiel, ignore les non validés et les valeurs inconnues", () => {
    const r = aggregateClosedQuestion(
      { id: "q1", question_text: "Trouvé ?", question_type: "binary" },
      [
        { tester_id: "t1", question_id: "q1", answer_text: "yes" },
        { tester_id: "t2", question_id: "q1", answer_text: "no" },
        { tester_id: "t3", question_id: "q1", answer_text: "Partial" },
        { tester_id: "t9", question_id: "q1", answer_text: "yes" },
        { tester_id: "t1", question_id: "q2", answer_text: "yes" },
      ],
      valid,
    );
    expect(r).toMatchObject({ question_type: "binary", answered: 3, yes: 1, no: 1, partial: 1 });
  });
  it("scale_1_5 : moyenne à 1 décimale et distribution", () => {
    const r = aggregateClosedQuestion(
      { id: "q1", question_text: "Facilité", question_type: "scale_1_5" },
      [
        { tester_id: "t1", question_id: "q1", answer_text: "4" },
        { tester_id: "t2", question_id: "q1", answer_text: "5" },
        { tester_id: "t3", question_id: "q1", answer_text: "abc" },
      ],
      valid,
    );
    expect(r).toMatchObject({ question_type: "scale_1_5", answered: 2, average: 4.5 });
    expect(r?.distribution).toEqual({ "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 });
  });
  it("texte → null", () => {
    expect(aggregateClosedQuestion({ id: "q", question_text: "?", question_type: "text" }, [], valid)).toBeNull();
  });
});

describe("scenarioResults", () => {
  const panel = selectReportPanel([pt({ id: "p1" }), pt({ id: "p2" }), pt({ id: "p3", staff_sloppy: true })]);
  const uc = { id: "uc1", criteria: [{ id: "c1", label: "Devis envoyé", is_primary: true }, { id: "c2", label: "Logo ajouté", is_primary: false }] };
  it("taux sur le critère principal, calculé sur les validés uniquement", () => {
    const r = scenarioResults(
      uc,
      [{ id: "q1", question_text: "Facile ?", question_type: "binary", use_case_id: "uc1" }],
      [
        { tester_id: "t-p1", question_id: "q1", answer_text: "yes" },
        { tester_id: "t-p2", question_id: "q1", answer_text: "no" },
        { tester_id: "t-p3", question_id: "q1", answer_text: "yes" },
      ],
      [
        { project_tester_id: "p1", criterion_id: "c1", passed: true },
        { project_tester_id: "p2", criterion_id: "c1", passed: false },
        { project_tester_id: "p3", criterion_id: "c1", passed: true },
        { project_tester_id: "p1", criterion_id: "c2", passed: true },
      ],
      panel,
    );
    expect(r.testers).toBe(2);
    expect(r.primary).toMatchObject({ label: "Devis envoyé", passed: 1, recorded: 2 });
    expect(r.primary_rate).toBe(50);
    expect(r.criteria[1]).toMatchObject({ label: "Logo ajouté", passed: 1, recorded: 1 });
    expect(r.closed_questions[0]).toMatchObject({ yes: 1, no: 1, answered: 2 });
  });
  it("aucune complétion enregistrée → taux null (jamais 0 % par défaut)", () => {
    const r = scenarioResults(uc, [], [], [], panel);
    expect(r.primary_rate).toBeNull();
    expect(r.closed_questions).toEqual([]);
  });
});
