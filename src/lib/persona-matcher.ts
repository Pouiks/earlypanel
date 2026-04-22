import type { SupabaseClient } from "@supabase/supabase-js";

export interface MatchingRules {
  job_title_keywords?: string[];
  sectors?: string[];
  digital_levels?: string[];
  company_sizes?: string[];
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
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Intersection de conditions non-vides : si une regle n'a pas de champ, il est ignore.
 * Un persona sans aucune regle non-vide ne peut matcher que par is_fallback.
 */
export function matchesRules(tester: TesterProfileForMatching, rules: MatchingRules): boolean {
  const hasAnyRule =
    (rules.job_title_keywords?.length ?? 0) > 0 ||
    (rules.sectors?.length ?? 0) > 0 ||
    (rules.digital_levels?.length ?? 0) > 0 ||
    (rules.company_sizes?.length ?? 0) > 0;
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
 * Retourne le persona_id final.
 */
export async function recomputePersonaForTester(
  admin: SupabaseClient,
  testerId: string
): Promise<string | null> {
  const { data: tester } = await admin
    .from("testers")
    .select("id, job_title, sector, digital_level, company_size, persona_id, persona_locked")
    .eq("id", testerId)
    .maybeSingle();

  if (!tester) return null;
  if (tester.persona_locked) return tester.persona_id;

  const newPersonaId = await computePersonaId(admin, {
    job_title: tester.job_title,
    sector: tester.sector,
    digital_level: tester.digital_level,
    company_size: tester.company_size,
  });

  if (newPersonaId !== tester.persona_id) {
    await admin
      .from("testers")
      .update({ persona_id: newPersonaId, updated_at: new Date().toISOString() })
      .eq("id", testerId);
  }

  return newPersonaId;
}

/**
 * Recalcule tous les testeurs non-locked. Utilise par le bouton "Recalculer" staff.
 */
export async function recomputeAllPersonas(admin: SupabaseClient): Promise<{ updated: number; total: number }> {
  const { data: testers } = await admin
    .from("testers")
    .select("id")
    .eq("persona_locked", false);

  if (!testers) return { updated: 0, total: 0 };

  let updated = 0;
  for (const t of testers) {
    const before = (await admin.from("testers").select("persona_id").eq("id", t.id).maybeSingle()).data?.persona_id;
    const after = await recomputePersonaForTester(admin, t.id);
    if (before !== after) updated++;
  }

  return { updated, total: testers.length };
}
