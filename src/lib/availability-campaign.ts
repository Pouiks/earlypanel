/**
 * Campagne « êtes-vous toujours disponible ? » : selection des destinataires,
 * envoi et mise en pause, partages entre le bouton staff
 * (POST /api/staff/testers/availability-campaign) et le cron hebdomadaire
 * (GET /api/cron/availability-campaign).
 *
 * Regles (constantes dans src/lib/tester-engagement.ts) :
 *   - cibles : status='active' + profil complet, SANS disponibilite confirmee
 *     en cours (inutile de redemander a quelqu'un qui a dit oui pour 3 mois) ;
 *   - boucle de 3 relances max espacees de 14 jours, comptees dans
 *     `availability_check_count` ; 14 jours apres la 3e sans reponse, le cron
 *     met le compte en pause (active -> inactive, reversible par un clic) ;
 *   - jamais aux testeurs desabonnes (`email_opt_out_at`, migration 047) :
 *     ils sortent de la boucle, donc aussi de la mise en pause ;
 *   - email-avant-DB : envoi, PUIS marquage (`availability_check_sent_at` +
 *     compteur). L'erreur de marquage est remontee (`marked: false`) au lieu
 *     d'etre avalee : en juillet 2026 la campagne est partie a 54 testeurs
 *     sans qu'aucun ne soit marque, et il est devenu impossible de savoir qui
 *     avait ete relance.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAvailabilityCampaignEmail } from "@/lib/email";
import { sendUserEmail } from "@/lib/email-unsubscribe";
import { signActionToken } from "@/lib/action-token";
import {
  AVAILABILITY_REMINDER_COOLDOWN_DAYS,
  AVAILABILITY_REMINDER_MAX,
  isLastReminder,
  reminderCount,
  shouldPauseAfterReminders,
  type ReminderLoopFields,
} from "@/lib/tester-engagement";

/** Colonnes necessaires a l'envoi ET aux regles de la boucle. */
export const CAMPAIGN_RECIPIENT_SELECT =
  "id, email, first_name, created_at, last_seen_at, last_login_at, available_until, availability_responded_at, availability_check_sent_at, availability_check_count, email_opt_out_at";

export interface CampaignRecipient extends ReminderLoopFields {
  id: string;
  email: string | null;
  first_name: string | null;
  created_at: string;
  email_opt_out_at: string | null;
}

export interface CampaignSendResult {
  tester_id: string;
  /** L'email est parti. */
  success: boolean;
  /** Marquage (date + compteur) bien ecrit (toujours false en mode test). */
  marked: boolean;
  /** Numero de la relance envoyee (1..MAX), absent en mode test. */
  reminder_no?: number;
  error?: string;
}

/**
 * Candidats de la boucle : actifs, profil complet, pas de disponibilite
 * confirmee en cours. Le cooldown et le plafond sont evalues en JS via
 * shouldAutoRemind / shouldPauseAfterReminders (une seule requete pour les
 * deux etapes du cron). `testerIds` restreint a un sous-ensemble (bouton
 * staff « relancer la selection »).
 */
export async function selectCampaignCandidates(
  admin: SupabaseClient,
  opts: { testerIds?: string[] | null; now?: Date } = {}
): Promise<{ data: CampaignRecipient[] | null; error: string | null }> {
  const now = opts.now ?? new Date();
  let query = admin
    .from("testers")
    .select(CAMPAIGN_RECIPIENT_SELECT)
    .eq("status", "active")
    .eq("profile_completed", true)
    .is("email_opt_out_at", null)
    .or(`available_until.is.null,available_until.lt.${now.toISOString()}`)
    .order("created_at", { ascending: true });
  if (opts.testerIds && opts.testerIds.length > 0) query = query.in("id", opts.testerIds);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as CampaignRecipient[], error: null };
}

/**
 * Envoie l'email a chaque destinataire, puis marque date + compteur (sauf en
 * mode test). Sequentiel et throttle (~2,5 mails/s) pour respecter le debit
 * Resend ; l'appelant borne le volume pour tenir dans son maxDuration.
 */
export async function sendAvailabilityCampaign(
  admin: SupabaseClient,
  opts: {
    recipients: (Pick<CampaignRecipient, "id" | "email" | "first_name" | "email_opt_out_at"> & Partial<ReminderLoopFields>)[];
    appUrl: string;
    isTest?: boolean;
    throttle?: boolean;
    now?: Date;
  }
): Promise<CampaignSendResult[]> {
  const isTest = opts.isTest === true;
  const throttle = opts.throttle !== false && !isTest;
  const results: CampaignSendResult[] = [];

  for (const t of opts.recipients) {
    if (!t.email) continue;
    const loop: ReminderLoopFields = { created_at: t.created_at ?? new Date(0).toISOString(), ...t };
    const reminderNo = Math.min(reminderCount(loop) + 1, AVAILABILITY_REMINDER_MAX);
    try {
      const confirmToken = signActionToken(t.id, "availability_confirm");
      const manageToken = signActionToken(t.id, "availability_manage");
      const ouiUrl = `${opts.appUrl}/app/auth/availability?token=${encodeURIComponent(confirmToken)}&choice=oui`;
      const nonUrl = `${opts.appUrl}/app/auth/availability?token=${encodeURIComponent(manageToken)}&choice=non`;

      // Email d'abord (email-avant-DB). Refuse si le testeur s'est desabonne.
      await sendUserEmail({
        recipient: { kind: "tester", id: t.id, email: t.email, email_opt_out_at: t.email_opt_out_at },
        appUrl: opts.appUrl,
        toName: t.first_name || undefined,
        subject: "Êtes-vous toujours disponible pour des tests earlypanel ?",
        html: buildAvailabilityCampaignEmail({
          firstName: t.first_name ?? null,
          ouiUrl,
          nonUrl,
          isLast: !isTest && isLastReminder(loop),
        }),
      });

      if (isTest) {
        results.push({ tester_id: t.id, success: true, marked: false });
      } else {
        const { error } = await admin
          .from("testers")
          .update({
            availability_check_sent_at: (opts.now ?? new Date()).toISOString(),
            availability_check_count: reminderNo,
          })
          .eq("id", t.id);
        results.push(
          error
            ? { tester_id: t.id, success: true, marked: false, reminder_no: reminderNo, error: `Email envoyé mais marquage échoué : ${error.message}` }
            : { tester_id: t.id, success: true, marked: true, reminder_no: reminderNo }
        );
      }
    } catch (e) {
      results.push({ tester_id: t.id, success: false, marked: false, error: e instanceof Error ? e.message : "Erreur envoi" });
    }

    if (throttle) await new Promise((r) => setTimeout(r, 400));
  }

  return results;
}

/**
 * Mise en pause apres la boucle : transition mono-directionnelle
 * active -> inactive, filtre atomique sur le statut precedent (anti-race si le
 * testeur clique « Oui » pile a ce moment : son update passe status=active et
 * le notre ne matche plus).
 */
export async function pauseAfterReminders(
  admin: SupabaseClient,
  candidates: CampaignRecipient[],
  now: Date = new Date()
): Promise<{ paused: string[]; errors: { tester_id: string; error: string }[] }> {
  const nowIso = now.toISOString();
  const paused: string[] = [];
  const errors: { tester_id: string; error: string }[] = [];
  for (const t of candidates) {
    if (!shouldPauseAfterReminders(t, now)) continue;
    const { data, error } = await admin
      .from("testers")
      .update({ status: "inactive", updated_at: nowIso })
      .eq("id", t.id)
      .eq("status", "active")
      .select("id");
    if (error) {
      errors.push({ tester_id: t.id, error: error.message });
      continue;
    }
    if (data && data.length > 0) paused.push(t.id);
  }
  return { paused, errors };
}

export function summarizeCampaign(results: CampaignSendResult[]) {
  return {
    sent: results.filter((r) => r.success).length,
    unmarked: results.filter((r) => r.success && !r.marked).length,
    last_reminders: results.filter((r) => r.success && r.reminder_no === AVAILABILITY_REMINDER_MAX).length,
    total: results.length,
    errors: results.filter((r) => !r.success || (r.success && !r.marked && r.error)),
    cooldown_days: AVAILABILITY_REMINDER_COOLDOWN_DAYS,
    max_reminders: AVAILABILITY_REMINDER_MAX,
  };
}
