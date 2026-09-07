/**
 * Evaluation d'un testeur face a la cible d'un projet.
 *
 * - `buildTarget(project)` : fusionne colonnes target_* + target_criteria.
 * - `activeCriteria(target)` : criteres renseignes (les autres n'existent pas).
 * - `evaluateTester(tester, target)` : score = criteres souhaites satisfaits,
 *   `requiredOk` = tous les obligatoires satisfaits, `details` pour les
 *   pastilles (une par critere actif, ok / ko / non renseigne).
 * - `requiredServerParams(target)` : pre-filtre API sur les obligatoires que
 *   /api/staff/testers sait filtrer (le reste est filtre cote client).
 *
 * Valeur testeur absente = critere NON satisfait (strict) mais signale
 * `unknown: true` pour l'afficher en gris plutot qu'en rouge.
 */
import { ageFromBirthDate } from "@/lib/taxonomy";
import {
  CRITERION_LABELS,
  parseTargetCriteria,
  type CriterionKey,
  type TargetCriteria,
} from "@/lib/target-criteria";

export interface ProjectTarget extends TargetCriteria {
  genders: string[];
  age_min: number | null;
  age_max: number | null;
  csps: string[];
  sector: string | null;
  locations: string[];
  headcount: number | null;
}

export interface TesterLike {
  gender?: string | null;
  birth_date?: string | null;
  csp?: string | null;
  sector?: string | null;
  city?: string | null;
  postal_code?: string | null;
  persona_id?: string | null;
  job_title?: string | null;
  company_size?: string | null;
  digital_level?: string | null;
  devices?: string[] | null;
  browsers?: string[] | null;
  mobile_os?: string | null;
  connection?: string | null;
  tools?: string[] | null;
  interests?: string[] | null;
  availability?: string | null;
  ux_experience?: string | null;
}

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  required: boolean;
  ok: boolean;
  /** La valeur testeur est absente : on ne peut pas trancher. */
  unknown: boolean;
  expected: string;
  actual: string;
}

export interface TesterEvaluation {
  score: number;
  total: number;
  requiredOk: boolean;
  details: CriterionResult[];
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function buildTarget(project: Record<string, unknown> | null | undefined): ProjectTarget {
  const p = project ?? {};
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const restricted = p.target_sector_restricted === true;
  const sector = typeof p.target_sector === "string" && p.target_sector.trim() ? p.target_sector.trim() : null;
  return {
    ...parseTargetCriteria(p.target_criteria),
    genders: strs(p.target_gender),
    age_min: num(p.target_age_min),
    age_max: num(p.target_age_max),
    csps: strs(p.target_csp),
    sector: restricted ? sector : null,
    locations: strs(p.target_locations),
    headcount: num(p.target_headcount),
  };
}

function jobKeywords(t: ProjectTarget): string[] {
  return t.job_title.split(",").map((k) => norm(k)).filter(Boolean);
}

/** Criteres qui ont une valeur dans la cible, dans l'ordre d'affichage. */
export function activeCriteria(t: ProjectTarget): CriterionKey[] {
  const out: CriterionKey[] = [];
  if (t.persona_ids.length) out.push("persona");
  if (jobKeywords(t).length) out.push("job_title");
  if (t.sector) out.push("sector");
  if (t.csps.length) out.push("csp");
  if (t.company_sizes.length) out.push("company_size");
  if (t.digital_levels.length) out.push("digital_level");
  if (t.genders.length) out.push("gender");
  if (t.age_min !== null || t.age_max !== null) out.push("age");
  if (t.locations.length) out.push("locations");
  if (t.devices.length) out.push("devices");
  if (t.mobile_os.length) out.push("mobile_os");
  if (t.browsers.length) out.push("browsers");
  if (t.connections.length) out.push("connection");
  if (t.tools.length) out.push("tools");
  if (t.interests.length) out.push("interests");
  if (t.availability.length) out.push("availability");
  if (t.ux_experience.length) out.push("ux_experience");
  return out;
}

type Check = { ok: boolean; unknown: boolean; expected: string; actual: string };

function inList(actual: string | null | undefined, wanted: string[]): Check {
  if (!actual) return { ok: false, unknown: true, expected: wanted.join(" / "), actual: "Non renseigné" };
  return { ok: wanted.includes(actual), unknown: false, expected: wanted.join(" / "), actual };
}

function overlaps(actual: string[] | null | undefined, wanted: string[]): Check {
  const arr = actual ?? [];
  if (arr.length === 0) return { ok: false, unknown: true, expected: wanted.join(" / "), actual: "Non renseigné" };
  const hit = arr.filter((a) => wanted.includes(a));
  return { ok: hit.length > 0, unknown: false, expected: wanted.join(" / "), actual: hit.length ? hit.join(", ") : arr.slice(0, 3).join(", ") };
}

function checkOne(key: CriterionKey, t: TesterLike, target: ProjectTarget): Check {
  switch (key) {
    case "persona": return inList(t.persona_id, target.persona_ids);
    case "job_title": {
      const kws = jobKeywords(target);
      if (!t.job_title) return { ok: false, unknown: true, expected: target.job_title, actual: "Non renseigné" };
      const title = norm(t.job_title);
      return { ok: kws.some((k) => title.includes(k)), unknown: false, expected: target.job_title, actual: t.job_title };
    }
    case "sector": return inList(t.sector, target.sector ? [target.sector] : []);
    case "csp": return inList(t.csp, target.csps);
    case "company_size": return inList(t.company_size, target.company_sizes);
    case "digital_level": return inList(t.digital_level, target.digital_levels);
    case "gender": return inList(t.gender, target.genders);
    case "age": {
      const age = ageFromBirthDate(t.birth_date ?? null);
      const expected = `${target.age_min ?? "?"}-${target.age_max ?? "?"} ans`;
      if (age === null) return { ok: false, unknown: true, expected, actual: "Non renseigné" };
      const ok = (target.age_min === null || age >= target.age_min) && (target.age_max === null || age <= target.age_max);
      return { ok, unknown: false, expected, actual: `${age} ans` };
    }
    case "locations": {
      const city = t.city ?? "";
      const cp = t.postal_code ?? "";
      if (!city && !cp) return { ok: false, unknown: true, expected: target.locations.join(" / "), actual: "Non renseigné" };
      const ok = target.locations.some((loc) => {
        const l = norm(loc);
        return (city !== "" && norm(city).includes(l)) || (cp !== "" && cp.startsWith(loc));
      });
      return { ok, unknown: false, expected: target.locations.join(" / "), actual: [city, cp].filter(Boolean).join(" ") };
    }
    case "devices": return overlaps(t.devices, target.devices);
    case "browsers": return overlaps(t.browsers, target.browsers);
    case "mobile_os": return inList(t.mobile_os, target.mobile_os);
    case "connection": return inList(t.connection, target.connections);
    case "tools": return overlaps(t.tools, target.tools);
    case "interests": return overlaps(t.interests, target.interests);
    case "availability": return inList(t.availability, target.availability);
    case "ux_experience": return inList(t.ux_experience, target.ux_experience);
  }
}

export function evaluateTester(tester: TesterLike, target: ProjectTarget): TesterEvaluation {
  const keys = activeCriteria(target);
  const required = new Set(target.required);
  const details: CriterionResult[] = keys.map((key) => {
    const c = checkOne(key, tester, target);
    return { key, label: CRITERION_LABELS[key], required: required.has(key), ...c };
  });
  const wanted = details.filter((d) => !d.required);
  return {
    score: wanted.filter((d) => d.ok).length,
    total: wanted.length,
    requiredOk: details.filter((d) => d.required).every((d) => d.ok),
    details,
  };
}

/**
 * Pre-filtre serveur : seulement les criteres OBLIGATOIRES que l'API sait
 * filtrer. Les autres obligatoires (outils, interets, dispo, experience UX,
 * metier multi-mots) sont appliques cote client via `requiredOk`.
 */
export function requiredServerParams(target: ProjectTarget, params: URLSearchParams): void {
  const req = new Set(target.required);
  if (req.has("gender")) target.genders.forEach((g) => params.append("gender", g));
  if (req.has("csp")) target.csps.forEach((c) => params.append("csp", c));
  if (req.has("sector") && target.sector) params.append("sector", target.sector);
  if (req.has("locations")) target.locations.forEach((l) => params.append("location", l));
  if (req.has("age")) {
    if (target.age_min !== null) params.set("age_min", String(target.age_min));
    if (target.age_max !== null) params.set("age_max", String(target.age_max));
  }
  if (req.has("persona")) target.persona_ids.forEach((p) => params.append("persona_id", p));
  if (req.has("company_size")) target.company_sizes.forEach((v) => params.append("company_size", v));
  if (req.has("digital_level")) target.digital_levels.forEach((v) => params.append("digital_level", v));
  if (req.has("devices")) target.devices.forEach((v) => params.append("devices", v));
  if (req.has("browsers")) target.browsers.forEach((v) => params.append("browsers", v));
  if (req.has("mobile_os")) target.mobile_os.forEach((v) => params.append("mobile_os", v));
  if (req.has("connection")) target.connections.forEach((v) => params.append("connection", v));
  const kws = jobKeywords(target);
  if (req.has("job_title") && kws.length === 1) params.set("job_title", kws[0]);
}
