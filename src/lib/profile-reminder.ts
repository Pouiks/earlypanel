/**
 * Relance « profil incomplet » : logique partagee entre le cron
 * /api/cron/profile-reminders et l'action manuelle staff
 * POST /api/staff/testers/[id]/profile-reminder.
 *
 * Cadence : 1re relance AFTER_DAYS apres l'inscription, puis une tous les
 * COOLDOWN_DAYS, MAX relances au total ; COOLDOWN_DAYS apres la derniere
 * sans completion, le testeur passe en status='inactive'.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, buildProfileReminderEmail } from "@/lib/email";
import { computeProfileCompleteness } from "@/lib/profile-completeness";

export const PROFILE_REMINDER_AFTER_DAYS = 2;
export const PROFILE_REMINDER_COOLDOWN_DAYS = 5;
export const PROFILE_REMINDER_MAX = 3;

const DAY_MS = 86_400_000;

export interface ReminderTester {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  profile_completed?: boolean | null;
  created_at?: string | null;
  profile_reminder_count?: number | null;
  profile_reminder_sent_at?: string | null;
  [key: string]: unknown;
}

export type ReminderStateKind =
  | "too_recent"   // inscrit depuis moins de AFTER_DAYS
  | "due"          // a relancer au prochain passage du cron
  | "cooldown"     // relance envoyee recemment, prochaine a `next_at`
  | "exhausted"    // 3 relances envoyees ; mise en pause a `next_at`
  | "paused";      // status inactive apres relances

export interface ReminderState {
  kind: ReminderStateKind;
  /** Date de la prochaine action automatique (relance ou pause), null si aucune. */
  next_at: string | null;
  count: number;
}

/**
 * Etat de relance d'un testeur pending/incomplet, tel que le cron le verrait
 * a `now`. Fonction pure, testee dans tests/unit/profile-reminder.test.ts.
 */
export function describeReminderState(t: ReminderTester, now: Date = new Date()): ReminderState {
  const count = t.profile_reminder_count ?? 0;
  const lastAt = t.profile_reminder_sent_at ? new Date(t.profile_reminder_sent_at) : null;
  const createdAt = t.created_at ? new Date(t.created_at) : now;

  if (t.status === "inactive") return { kind: "paused", next_at: null, count };

  if (count >= PROFILE_REMINDER_MAX) {
    const pauseAt = new Date((lastAt ?? now).getTime() + PROFILE_REMINDER_COOLDOWN_DAYS * DAY_MS);
    return { kind: "exhausted", next_at: pauseAt.toISOString(), count };
  }

  if (!lastAt) {
    const firstAt = new Date(createdAt.getTime() + PROFILE_REMINDER_AFTER_DAYS * DAY_MS);
    return firstAt <= now
      ? { kind: "due", next_at: null, count }
      : { kind: "too_recent", next_at: firstAt.toISOString(), count };
  }

  const nextAt = new Date(lastAt.getTime() + PROFILE_REMINDER_COOLDOWN_DAYS * DAY_MS);
  return nextAt <= now
    ? { kind: "due", next_at: null, count }
    : { kind: "cooldown", next_at: nextAt.toISOString(), count };
}

/**
 * Envoie UNE relance a un testeur et met a jour les colonnes d'idempotence
 * APRES l'envoi reussi. Ne verifie ni le cooldown ni le plafond : c'est a
 * l'appelant (cron : via la requete ; staff : explicitement) de decider.
 * Retourne le numero de la relance envoyee.
 */
export async function sendProfileReminder(
  admin: SupabaseClient,
  tester: ReminderTester,
  appUrl: string,
): Promise<{ reminderNumber: number; missingCount: number }> {
  if (!tester.email) throw new Error("tester sans email");
  const completeness = computeProfileCompleteness(tester);

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: tester.email,
    options: { redirectTo: `${appUrl}/app/auth/callback` },
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) throw new Error(linkErr?.message || "magic link indisponible");
  const callback = new URL(`${appUrl}/app/auth/callback`);
  callback.searchParams.set("token_hash", hashedToken);
  callback.searchParams.set("type", "magiclink");
  callback.searchParams.set("next", "/app/onboarding");

  const reminderNumber = (tester.profile_reminder_count ?? 0) + 1;
  const isLast = reminderNumber >= PROFILE_REMINDER_MAX;
  await sendEmail({
    to: tester.email,
    toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
    subject: isLast
      ? "Dernier rappel : votre profil earlypanel est incomplet"
      : `Il manque ${completeness.count} information${completeness.count > 1 ? "s" : ""} à votre profil earlypanel`,
    html: buildProfileReminderEmail({
      firstName: tester.first_name ?? null,
      missingCount: completeness.count,
      missingLabels: completeness.missing.map((m) => m.label),
      magicLink: callback.toString(),
      reminderNumber,
      isLast,
      pauseAfterDays: PROFILE_REMINDER_COOLDOWN_DAYS,
    }),
  });

  const nowIso = new Date().toISOString();
  const { error: updErr } = await admin
    .from("testers")
    .update({ profile_reminder_sent_at: nowIso, profile_reminder_count: reminderNumber, updated_at: nowIso })
    .eq("id", tester.id);
  if (updErr) {
    // Email parti mais compteur non mis a jour : au pire une relance de plus
    // au prochain passage. On remonte l'info a l'appelant.
    throw new Error(`update_failed_post_email: ${updErr.message}`);
  }
  return { reminderNumber, missingCount: completeness.count };
}
