import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeReadableTesterId, computeAge } from "@/lib/report-config";

/**
 * GET /api/staff/projects/[id]/report/sources
 *
 * "Matière première" du rapport, pour ASSISTER le staff sans rédiger à sa
 * place (principe : le staff rédige, le système propose/calcule) :
 *   - verbatims : les vraies réponses TEXTE collectées, avec l'ID lisible du
 *     testeur (T01…) et la question — pour les insérer en un clic dans une
 *     friction au lieu de les retaper.
 *   - figures : chiffres clés CALCULÉS (taille du panel, âge moyen, taux de
 *     complétion sur le critère principal) proposés en un clic.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;

  const [{ data: pts }, { data: questions }, { data: answers }, { data: useCases }] = await Promise.all([
    admin
      .from("project_testers")
      .select("id, tester_id, tester:testers(birth_date)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    admin
      .from("project_questions")
      .select("id, question_text, question_type, use_case_id")
      .eq("project_id", projectId),
    admin
      .from("project_tester_answers")
      .select("tester_id, question_id, answer_text")
      .eq("project_id", projectId),
    admin
      .from("project_use_cases")
      .select("id, title, expected_testers_count, use_case_success_criteria(id, is_primary)")
      .eq("project_id", projectId)
      .order("order", { ascending: true }),
  ]);

  const testerList = pts ?? [];
  // Mapping tester_id (interne) → ID lisible T01, T02… (ordre d'affectation).
  const readableByTester = new Map<string, string>();
  testerList.forEach((pt, i) => readableByTester.set(pt.tester_id as string, computeReadableTesterId(i)));

  // Métadonnées question : uniquement les questions TEXTE peuvent produire un
  // verbatim (binary/scale stockent 'yes'/'4'… — pas des verbatims).
  const ucTitleById = new Map<string, string>();
  (useCases ?? []).forEach((uc) => ucTitleById.set(uc.id as string, uc.title as string));
  const questionMeta = new Map<string, { text: string; isText: boolean; ucTitle: string }>();
  (questions ?? []).forEach((q) => {
    const type = (q.question_type as string | null) ?? "text";
    questionMeta.set(q.id as string, {
      text: q.question_text as string,
      isText: type === "text",
      ucTitle: q.use_case_id ? ucTitleById.get(q.use_case_id as string) ?? "" : "",
    });
  });

  const verbatims = (answers ?? [])
    .map((a) => {
      const meta = questionMeta.get(a.question_id as string);
      const text = String(a.answer_text ?? "").trim();
      if (!meta || !meta.isText || !text) return null;
      const readable = readableByTester.get(a.tester_id as string);
      if (!readable) return null;
      return {
        tester_id: a.tester_id as string,
        tester_readable: readable,
        question_text: meta.text,
        use_case_title: meta.ucTitle,
        answer_text: text,
      };
    })
    .filter(Boolean)
    // Ordre stable : par ID testeur lisible.
    .sort((a, b) => (a!.tester_readable < b!.tester_readable ? -1 : 1));

  // ---- Chiffres clés calculés -----------------------------------------
  const panelSize = testerList.length;
  const figures: { value: string; label: string }[] = [];
  if (panelSize > 0) {
    figures.push({ value: String(panelSize), label: panelSize > 1 ? "testeurs" : "testeur" });
  }

  const ages = testerList
    .map((pt) => {
      const t = Array.isArray(pt.tester) ? pt.tester[0] : pt.tester;
      return computeAge((t as { birth_date?: string | null } | null)?.birth_date ?? null);
    })
    .filter((a): a is number => a !== null);
  if (ages.length > 0) {
    figures.push({ value: `${Math.round(ages.reduce((s, a) => s + a, 0) / ages.length)} ans`, label: "âge moyen du panel" });
  }

  // Taux de complétion : % de testeurs ayant validé le critère PRINCIPAL de
  // chaque cas d'usage. Nécessite des use_case_completions enregistrées.
  const primaryCriterionIds: string[] = [];
  const ucByPrimary = new Map<string, { expected: number | null }>();
  (useCases ?? []).forEach((uc) => {
    const crits = (uc.use_case_success_criteria as { id: string; is_primary: boolean }[] | null) ?? [];
    const primary = crits.find((c) => c.is_primary);
    if (primary) {
      primaryCriterionIds.push(primary.id);
      ucByPrimary.set(primary.id, { expected: (uc.expected_testers_count as number | null) ?? null });
    }
  });

  if (primaryCriterionIds.length > 0 && testerList.length > 0) {
    const ptIds = testerList.map((pt) => pt.id as string);
    const { data: completions } = await admin
      .from("use_case_completions")
      .select("project_tester_id, criterion_id, passed")
      .in("project_tester_id", ptIds)
      .in("criterion_id", primaryCriterionIds);

    if (completions && completions.length > 0) {
      const rates: number[] = [];
      for (const critId of primaryCriterionIds) {
        const passed = completions.filter((c) => c.criterion_id === critId && c.passed === true).length;
        const denom = ucByPrimary.get(critId)?.expected || panelSize;
        if (denom > 0) rates.push((100 * passed) / denom);
      }
      if (rates.length > 0) {
        const global = Math.round(rates.reduce((s, r) => s + r, 0) / rates.length);
        figures.push({ value: `${global}%`, label: "de complétion sur le critère principal" });
      }
    }
  }

  return NextResponse.json({ verbatims, figures });
}
