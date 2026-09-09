/**
 * Activite des testeurs (migration 043) : derniere connexion, derniere
 * requete authentifiee, filtre d'inactivite et seuil de retention RGPD.
 *
 * Pur (pas d'acces DB) : teste unitairement dans tests/unit/tester-activity.test.ts.
 */

/** Espacement minimal entre deux ecritures de last_seen_at (1 h). */
export const SEEN_STAMP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Duree de conservation promise dans la politique de confidentialite
 * (src/app/confidentialite/page.tsx) : 3 ans apres la derniere connexion.
 */
export const RGPD_RETENTION_DAYS = 3 * 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Faut-il re-horodater last_seen_at ? Oui si jamais horodate ou si la
 * derniere trace date de plus d'une heure. Evite une ecriture par requete.
 */
export function shouldStampSeen(lastSeenAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSeenAt) return true;
  const t = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t >= SEEN_STAMP_INTERVAL_MS;
}

export interface TesterActivityFields {
  last_seen_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
}

/**
 * Date de reference « derniere activite » : derniere requete, sinon
 * derniere connexion, sinon inscription. Ne renvoie jamais null : un
 * testeur inscrit a au moins une date.
 */
export function lastActivityAt(t: TesterActivityFields): string {
  return t.last_seen_at ?? t.last_login_at ?? t.created_at;
}

/** Nombre de jours entiers ecoules depuis une date ISO (0 = aujourd'hui). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

/**
 * Libelle court pour une colonne de liste : « aujourd'hui », « hier »,
 * « il y a 12 j », « il y a 3 mois », « il y a 2 ans ». `null` = « jamais ».
 */
export function formatLastSeen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "jamais";
  const days = daysSince(iso, now);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 60) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return years === 1 ? "il y a 1 an" : `il y a ${years} ans`;
}

/** Filtre « activite » de la liste staff (query param `activity`). */
export const ACTIVITY_FILTERS = [
  { value: "", label: "Toute activité", days: null },
  { value: "inactive_30", label: "Inactifs > 30 j", days: 30 },
  { value: "inactive_90", label: "Inactifs > 90 j", days: 90 },
  { value: "inactive_180", label: "Inactifs > 6 mois", days: 180 },
  { value: "inactive_365", label: "Inactifs > 1 an", days: 365 },
  { value: "rgpd", label: "À purger (RGPD, > 3 ans)", days: RGPD_RETENTION_DAYS },
  { value: "never", label: "Jamais connectés", days: null },
] as const;

export type ActivityFilterValue = (typeof ACTIVITY_FILTERS)[number]["value"];

/** Vrai si la derniere activite depasse la duree de conservation RGPD. */
export function isPastRgpdRetention(t: TesterActivityFields, now: Date = new Date()): boolean {
  return daysSince(lastActivityAt(t), now) >= RGPD_RETENTION_DAYS;
}

/**
 * Traduit le filtre en clause PostgREST `.or(...)`, ou null si aucun filtre.
 * « Inactif depuis N jours » = derniere requete plus vieille que N jours,
 * OU jamais connecte mais inscrit depuis plus de N jours (sinon un inscrit
 * d'hier sans session compterait comme inactif).
 */
export function activityFilterToOr(value: string, now: Date = new Date()): string | null {
  if (!value) return null;
  if (value === "never") return "last_seen_at.is.null";
  const def = ACTIVITY_FILTERS.find((f) => f.value === value);
  if (!def || def.days === null) return null;
  const cutoff = new Date(now.getTime() - def.days * DAY_MS).toISOString();
  return `last_seen_at.lt."${cutoff}",and(last_seen_at.is.null,created_at.lt."${cutoff}")`;
}
