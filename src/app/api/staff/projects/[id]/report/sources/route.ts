import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAge } from "@/lib/report-config";
import { selectReportPanel, scenarioResults, type SubmissionLike } from "@/lib/report-panel";

/**
 * GET /api/staff/projects/[id]/report/sources
 *
 * "Matière première" du rapport, pour ASSISTER le staff sans rédiger à sa
 * place (principe : le staff rédige, le système propose/calcule) :
 *   - verbatims : les vraies réponses TEXTE des participations VALIDÉES
 *     (src/lib/report-panel.ts), avec l'ID lisible du testeur (T01…), la
 *     question d'origine et les chemins des captures jointes — pour les
 *     insérer en un clic dans une friction sans perdre le contexte.
 *   - figures : chiffres clés CALCULÉS sur le panel validé (taille, âge
 *     moyen, taux de complétion sur le critère principal).
 *   - panel : comptage validés / exclus, pour l'affichage dans l'éditeur.
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
      .select("id, tester_id, status, staff_rating, staff_sloppy, submitted_at, created_at, tester:testers(birth_date)")
      .eq("project_id", projectId),
    admin
      .from("project_questions")
      .select("id, question_text, question_type, use_case_id")
      .eq("project_id", projectId)
      .order("position"),
    admin
      .from("project_tester_answers")
      .select("tester_id, question_id, answer_text, image_urls")
      .eq("project_id", projectId),
    admin
      .from("project_use_cases")
      .select("id, title, use_case_success_criteria(id, label, is_primary)")
      .eq("project_id", projectId)
      .order("order", { ascending: true }),
  ]);

  const panel = selectReportPanel((pts ?? []) as (SubmissionLike & { tester: unknown })[]);

  const ucTitleById = new Map<string, string>();
  (useCases ?? []).forEach((uc) => ucTitleById.set(uc.id as string, uc.title as string));
  const qList = (questions ?? []) as { id: string; question_text: string; question_type: string | null; use_case_id: string | null }[];
  const questionMeta = new Map<string, { text: string; isText: boolean; ucTitle: string }>();
  qList.forEach((q) => {
    const type = q.question_type ?? "text";
    questionMeta.set(q.id, {
      text: q.question_text,
      isText: type === "text",
      ucTitle: q.use_case_id ? ucTitleById.get(q.use_case_id) ?? "" : "",
    });
  });

  const aList = (answers ?? []) as { tester_id: string; question_id: string; answer_text: string | null; image_urls: string[] | null }[];

  const verbatims = aList
    .map((a) => {
      const meta = questionMeta.get(a.question_id);
      const text = String(a.answer_text ?? "").trim();
      if (!meta || !meta.isText || !text) return null;
      const readable = panel.readableByTester.get(a.tester_id);
      if (!readable) return null;
      return {
        tester_id: a.tester_id,
        tester_readable: readable,
        question_id: a.question_id,
        question_text: meta.text,
        use_case_title: meta.ucTitle,
        answer_text: text,
        image_paths: Array.isArray(a.image_urls) ? a.image_urls : [],
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => (a.tester_readable < b.tester_readable ? -1 : 1));

  // ---- Chiffres clés calculés (panel validé) ---------------------------
  const panelSize = panel.validated.length;
  const figures: { value: string; label: string }[] = [];
  if (panelSize > 0) {
    figures.push({ value: String(panelSize), label: panelSize > 1 ? "testeurs" : "testeur" });
  }

  const ages = panel.validated
    .map((pt) => {
      const t = Array.isArray(pt.tester) ? pt.tester[0] : pt.tester;
      return computeAge((t as { birth_date?: string | null } | null)?.birth_date ?? null);
    })
    .filter((a): a is number => a !== null);
  if (ages.length > 0) {
    figures.push({ value: `${Math.round(ages.reduce((s, a) => s + a, 0) / ages.length)} ans`, label: "âge moyen du panel" });
  }

  if (panelSize > 0 && (useCases ?? []).length > 0) {
    const { data: completions } = await admin
      .from("use_case_completions")
      .select("project_tester_id, criterion_id, passed")
      .in("project_tester_id", panel.validated.map((p) => p.id));
    const rates = (useCases ?? [])
      .map((uc) => {
        const criteria = ((uc.use_case_success_criteria as { id: string; label: string; is_primary: boolean }[] | null) ?? []);
        return scenarioResults({ id: uc.id as string, criteria }, qList.map((q) => ({ ...q, question_type: q.question_type ?? "text" })), aList, completions ?? [], panel).primary_rate;
      })
      .filter((r): r is number => r !== null);
    if (rates.length > 0) {
      const global = Math.round(rates.reduce((s, r) => s + r, 0) / rates.length);
      figures.push({ value: `${global}%`, label: "de complétion sur le critère principal" });
    }
  }

  return NextResponse.json({ verbatims, figures, panel: panel.counts });
}
