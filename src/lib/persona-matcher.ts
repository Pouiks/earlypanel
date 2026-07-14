import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyJobTitle } from "./job-classifier";

export interface MatchingRules {
  // Legacy (toujours supporté) : match par mot-clé sur le titre libre.
  job_title_keywords?: string[];
  sectors?: string[];
  digital_levels?: string[];
  company_sizes?: string[];
  // Taxonomie dérivée (source de vérité de la rareté / qualification).
  seniorities?: string[];
  job_families?: string[];
  // Alternative : matche si AU MOINS UN des sous-jeux de règles matche (OU).
  // Permet ex. « Niche Premium = profession réglementée (toute taille) OU
  // dirigeant d'une grande entreprise ». Si `any_of` est présent, les clés
  // plates de CE niveau sont ignorées (on n'évalue que les sous-jeux).
  any_of?: MatchingRules[];
}

export interface PersonaRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  min_reward_cents: number;
  max_reward_cents: number;
  matching_rules: MatchingRules;
  priority: number;
  is_active: boolean;
  is_fallback: boolean;
}

interface TesterProfileForMatching {
  job_title: string | null;
  sector: string | null;
  digital_level: string | null;
  company_size: string | null;
  seniority?: string | null;
  job_family?: string | null;
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Intersection de conditions non-vides : si une regle n'a pas de champ, il est ignore.
 * Un persona sans aucune regle non-vide ne peut matcher que par is_fallback.
 * Supporte `any_of` (OU de sous-jeux de regles).
 */
export function matchesRules(tester: TesterProfileForMatching, rules: MatchingRules): boolean {
  // OU logique : matche si un des sous-jeux matche.
  if (rules.any_of?.length) {
    return rules.any_of.some((sub) => matchesRules(tester, sub));
  }

  const hasAnyRule =
    (rules.job_title_keywords?.length ?? 0) > 0 ||
    (rules.sectors?.length ?? 0) > 0 ||
    (rules.digital_levels?.length ?? 0) > 0 ||
    (rules.company_sizes?.length ?? 0) > 0 ||
    (rules.seniorities?.length ?? 0) > 0 ||
    (rules.job_families?.length ?? 0) > 0;
  if (!hasAnyRule) return false;

  if (rules.job_title_keywords?.length) {
    const title = normalize(tester.job_title);
    const anyMatch = rules.job_title_keywords.some((kw) => title.includes(normalize(kw)));
    if (!anyMatch) return false;
  }

  if (rules.sectors?.length) {
    if (!tester.sector || !rules.sectors.includes(tester.sector)) return false;
  }

  if (rules.digital_levels?.length) {
    if (!tester.digital_level || !rules.digital_levels.includes(tester.digital_level)) return false;
  }

  if (rules.company_sizes?.length) {
    if (!tester.company_size || !rules.company_sizes.includes(tester.company_size)) return false;
  }

  if (rules.seniorities?.length) {
    if (!tester.seniority || !rules.seniorities.includes(tester.seniority)) return false;
  }

  if (rules.job_families?.length) {
    if (!tester.job_family || !rules.job_families.includes(tester.job_family)) return false;
  }

  return true;
}

/**
 * Calcule le persona adequat pour un testeur. N'ecrit rien : retourne juste l'id (ou null).
 */
export async function computePersonaId(
  admin: SupabaseClient,
  testerProfile: TesterProfileForMatching
): Promise<string | null> {
  const { data: personas } = await admin
    .from("tester_personas")
    .select("id, slug, name, description, min_reward_cents, max_reward_cents, matching_rules, priority, is_active, is_fallback")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (!personas) return null;

  for (const p of personas as PersonaRow[]) {
    if (p.is_fallback) continue;
    if (matchesRules(testerProfile, p.matching_rules || {})) {
      return p.id;
    }
  }

  const fallback = (personas as PersonaRow[]).find((p) => p.is_fallback);
  return fallback?.id ?? null;
}

/**
 * Recalcule et persiste le persona d'un testeur si persona_locked != true.
 *
 * Derive AUSSI `job_family` + `seniority` depuis le `job_title` (texte libre) et
 * persiste ces colonnes si elles ont change (self-healing : un recompute suffit
 * a backfiller la taxonomie ET a corriger le persona). Retourne le persona_id
 * final.
 */
export async function recomputePersonaForTester(
  admin: SupabaseClient,
  testerId: string
): Promise<string | null> {
  const { data: tester } = await admin
    .from("testers")
    .select("id, job_title, sector, digital_level, company_size, seniority, job_family, persona_id, persona_locked")
    .eq("id", testerId)
    .maybeSingle();

  if (!tester) return null;
  if (tester.persona_locked) return tester.persona_id;

  // Taxonomie derivee du titre : source de verite de la rarete / qualification.
  const { job_family, seniority } = classifyJobTitle(tester.job_title);

  const newPersonaId = await computePersonaId(admin, {
    job_title: tester.job_title,
    sector: tester.sector,
    digital_level: tester.digital_level,
    company_size: tester.company_size,
    seniority,
    job_family,
  });

  // Ecriture groupee : colonnes taxonomiques + persona, uniquement si change.
  const patch: Record<string, unknown> = {};
  if (tester.job_family !== job_family) patch.job_family = job_family;
  if (tester.seniority !== seniority) patch.seniority = seniority;
  if (tester.persona_id !== newPersonaId) patch.persona_id = newPersonaId;

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();
    await admin.from("testers").update(patch).eq("id", tester.id);
  }

  return newPersonaId;
}

/**
 * Recalcule les testeurs non-locked. Par defaut on cible UNIQUEMENT ceux
 * sans persona (`persona_id IS NULL`).
 *
 * Pour un recompute global (ex: matrice de matching modifiee, backfill de la
 * taxonomie), passer `{ onlyEmpty: false }` — c'est ce que fait le bouton staff
 * « Recalculer tous les testeurs ».
 */
export async function recomputeAllPersonas(
  admin: SupabaseClient,
  options: { onlyEmpty?: boolean } = {}
): Promise<{ updated: number; total: number }> {
  const onlyEmpty = options.onlyEmpty !== false; // defaut true

  let q = admin.from("testers").select("id").eq("persona_locked", false);
  if (onlyEmpty) {
    q = q.is("persona_id", null);
  }
  const { data: testers } = await q;

  if (!testers) return { updated: 0, total: 0 };

  let updated = 0;
  for (const t of testers) {
    const before = (await admin.from("testers").select("persona_id").eq("id", t.id).maybeSingle()).data?.persona_id;
    const after = await recomputePersonaForTester(admin, t.id);
    if (before !== after) updated++;
  }

  return { updated, total: testers.length };
}
