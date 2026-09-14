/**
 * Etat d'engagement d'un testeur, CALCULE (jamais stocke) a partir de la
 * disponibilite confirmee et de la derniere activite, et regles de la
 * boucle de relance de disponibilite (3 relances, puis pause).
 *
 * Pourquoi : `status = 'active'` veut seulement dire « profil complet » et
 * n'expire jamais. Sans cet etat, un inscrit d'avril jamais revenu est
 * affiche et selectionne comme un testeur qui a confirme hier.
 *
 *   - available  : `available_until` dans le futur (campagne ou bouton
 *                  « Je suis disponible »). Fiable pour une mission.
 *   - to_remind  : pas de confirmation en cours, mais une trace d'activite
 *                  ou une reponse recente (< DORMANT_AFTER_DAYS).
 *   - dormant    : ni confirmation, ni activite, ni reponse depuis
 *                  DORMANT_AFTER_DAYS.
 *
 * Boucle de relance (meme mecanique que la relance profil, migration 046) :
 *   - un testeur sans disponibilite confirmee est relance au plus
 *     AVAILABILITY_REMINDER_MAX fois, espacees d'au moins
 *     AVAILABILITY_REMINDER_COOLDOWN_DAYS ;
 *   - AVAILABILITY_REMINDER_COOLDOWN_DAYS apres la derniere relance sans
 *     reponse, le cron le met en pause (status active -> inactive) ;
 *   - toute reponse (Oui, gerer mon compte, bouton de l'espace) remet le
 *     compteur a zero, et « Oui » reactive un compte en pause.
 *
 * Utilise par la liste staff (pastille + tri), le selecteur de testeurs d'un
 * projet (bonus / malus de tri, jamais une exclusion) et le cron de campagne.
 *
 * Pur : teste dans tests/unit/tester-engagement.test.ts.
 */
import { daysSince, lastActivityAt, type TesterActivityFields } from "@/lib/tester-activity";

/** Seuil de mise en sommeil (affichage) : 6 mois sans activite ni reponse. */
export const DORMANT_AFTER_DAYS = 180;

/** Boucle de relance : 3 relances max, 14 jours entre deux, pause 14 jours apres la derniere. */
export const AVAILABILITY_REMINDER_MAX = 3;
export const AVAILABILITY_REMINDER_COOLDOWN_DAYS = 14;

export type EngagementState = "available" | "to_remind" | "dormant";

export interface EngagementFields extends TesterActivityFields {
  available_until?: string | null;
  availability_responded_at?: string | null;
}

export interface ReminderLoopFields extends EngagementFields {
  availability_check_sent_at?: string | null;
  availability_check_count?: number | null;
}

export const ENGAGEMENT_LABELS: Record<EngagementState, string> = {
  available: "Disponible",
  to_remind: "À relancer",
  dormant: "Dormant",
};

export const ENGAGEMENT_TITLES: Record<EngagementState, string> = {
  available: "Disponibilité confirmée par le testeur (campagne ou espace testeur).",
  to_remind: "Aucune disponibilité confirmée en cours, mais une activité ou une réponse depuis moins de 6 mois. Relancé jusqu'à 3 fois, puis mis en pause.",
  dormant: "Aucune disponibilité confirmée, aucune activité ni réponse depuis plus de 6 mois. Relancé jusqu'à 3 fois, puis mis en pause.",
};

/** Ordre de tri : les disponibles d'abord, les dormants en dernier. */
export const ENGAGEMENT_ORDER: Record<EngagementState, number> = {
  available: 0,
  to_remind: 1,
  dormant: 2,
};

function isFutureIso(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= now.getTime();
}

/**
 * Date de reference pour la mise en sommeil : la plus recente entre la
 * derniere activite (requete, connexion, inscription) et la derniere
 * reponse a une campagne de disponibilite (un clic « Oui » ou « gerer »
 * depuis l'email compte comme un signe de vie meme sans connexion).
 */
export function lastSignOfLifeAt(t: EngagementFields): string {
  const activity = lastActivityAt(t);
  const responded = t.availability_responded_at ?? null;
  if (!responded) return activity;
  return new Date(responded).getTime() > new Date(activity).getTime() ? responded : activity;
}

export function isAvailabilityConfirmed(t: EngagementFields, now: Date = new Date()): boolean {
  return isFutureIso(t.available_until, now);
}

export function engagementState(t: EngagementFields, now: Date = new Date()): EngagementState {
  if (isAvailabilityConfirmed(t, now)) return "available";
  return daysSince(lastSignOfLifeAt(t), now) >= DORMANT_AFTER_DAYS ? "dormant" : "to_remind";
}

/**
 * Ajustement de tri pour le selecteur de testeurs d'un projet : +1 pour un
 * disponible, -1 pour un dormant, 0 sinon. Applique au score de criteres
 * pour l'ORDRE seulement ; le score affiche et l'exclusion par les
 * obligatoires ne changent pas (principe : on ecarte l'impossible, on
 * classe le reste).
 */
export function engagementSortBonus(state: EngagementState): number {
  if (state === "available") return 1;
  if (state === "dormant") return -1;
  return 0;
}

export function reminderCount(t: ReminderLoopFields): number {
  const n = t.availability_check_count;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** La derniere relance date-t-elle d'au moins COOLDOWN jours (ou jamais relance) ? */
export function reminderCooldownElapsed(t: ReminderLoopFields, now: Date = new Date()): boolean {
  if (!t.availability_check_sent_at) return true;
  return daysSince(t.availability_check_sent_at, now) >= AVAILABILITY_REMINDER_COOLDOWN_DAYS;
}

/**
 * Le cron doit-il relancer ce testeur a ce passage ? Pas de disponibilite
 * confirmee, moins de AVAILABILITY_REMINDER_MAX relances depuis la derniere
 * reponse, et cooldown ecoule.
 */
export function shouldAutoRemind(t: ReminderLoopFields, now: Date = new Date()): boolean {
  if (isAvailabilityConfirmed(t, now)) return false;
  if (reminderCount(t) >= AVAILABILITY_REMINDER_MAX) return false;
  return reminderCooldownElapsed(t, now);
}

/**
 * Le cron doit-il mettre ce testeur en pause ? Pas de disponibilite
 * confirmee, AVAILABILITY_REMINDER_MAX relances envoyees, et cooldown
 * ecoule depuis la derniere sans reponse. L'appelant fait la transition
 * active -> inactive avec un filtre atomique sur le statut.
 */
export function shouldPauseAfterReminders(t: ReminderLoopFields, now: Date = new Date()): boolean {
  if (isAvailabilityConfirmed(t, now)) return false;
  if (reminderCount(t) < AVAILABILITY_REMINDER_MAX) return false;
  return reminderCooldownElapsed(t, now);
}

/** Vrai si la prochaine relance sera la derniere avant la pause (texte de l'email). */
export function isLastReminder(t: ReminderLoopFields): boolean {
  return reminderCount(t) + 1 >= AVAILABILITY_REMINDER_MAX;
}

export type AvailabilityReminderStateKind =
  | "due"        // relance au prochain passage du cron
  | "cooldown"   // relance envoyee, prochaine a `next_at`
  | "exhausted"  // 3 relances envoyees ; pause a `next_at`
  | "paused";    // status inactive apres 3 relances sans reponse

export interface AvailabilityReminderState {
  kind: AvailabilityReminderStateKind;
  /** Date de la prochaine action automatique (relance ou pause), null si aucune. */
  next_at: string | null;
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Etat de la boucle pour un testeur SANS disponibilite confirmee, tel que le
 * cron le verrait a `now`. Miroir de describeReminderState (relance profil)
 * pour la vue staff. Pur, teste dans tests/unit/tester-engagement.test.ts.
 */
export function describeAvailabilityReminderState(
  t: ReminderLoopFields & { status?: string | null },
  now: Date = new Date()
): AvailabilityReminderState {
  const count = reminderCount(t);
  const lastAt = t.availability_check_sent_at ? new Date(t.availability_check_sent_at) : null;

  if (t.status === "inactive") return { kind: "paused", next_at: null, count };

  if (count >= AVAILABILITY_REMINDER_MAX) {
    const pauseAt = new Date((lastAt ?? now).getTime() + AVAILABILITY_REMINDER_COOLDOWN_DAYS * DAY_MS);
    return { kind: "exhausted", next_at: pauseAt.toISOString(), count };
  }

  if (!lastAt) return { kind: "due", next_at: null, count };

  const nextAt = new Date(lastAt.getTime() + AVAILABILITY_REMINDER_COOLDOWN_DAYS * DAY_MS);
  return nextAt <= now
    ? { kind: "due", next_at: null, count }
    : { kind: "cooldown", next_at: nextAt.toISOString(), count };
}
