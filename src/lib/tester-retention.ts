/**
 * Retention RGPD des comptes testeurs (migration 044).
 *
 * La politique de confidentialite promet une conservation de 3 ans apres
 * la derniere connexion (RGPD_RETENTION_DAYS, src/lib/tester-activity.ts).
 * Le cron /api/cron/retention applique cette promesse en deux temps :
 *
 *   1. « warn »      : 90 jours avant l'echeance, email d'avertissement.
 *                      Une connexion suffit a remettre le compteur a zero.
 *   2. « anonymize » : echeance atteinte ET avertissement envoye depuis au
 *                      moins 90 jours sans retour -> anonymisation.
 *
 * Fonctions pures, testees dans tests/unit/tester-retention.test.ts.
 */
import { RGPD_RETENTION_DAYS, daysSince, lastActivityAt, type TesterActivityFields } from "@/lib/tester-activity";

/** Delai entre l'avertissement et l'anonymisation. */
export const RETENTION_WARNING_DAYS = 90;

/** Jours d'inactivite a partir desquels on avertit. */
export const RETENTION_WARN_AFTER_DAYS = RGPD_RETENTION_DAYS - RETENTION_WARNING_DAYS;

const DAY_MS = 86_400_000;

export interface RetentionTester extends TesterActivityFields {
  id: string;
  retention_warning_sent_at?: string | null;
  anonymized_at?: string | null;
}

export type RetentionStage = "none" | "warn" | "anonymize";

/**
 * Etape de retention d'un testeur a l'instant `now`.
 *
 * Un avertissement ne compte que s'il est POSTERIEUR a la derniere activite :
 * un testeur averti, revenu, puis inactif 3 ans de plus, doit etre re-averti
 * avant toute anonymisation.
 */
export function retentionStage(t: RetentionTester, now: Date = new Date()): RetentionStage {
  if (t.anonymized_at) return "none";
  const activity = lastActivityAt(t);
  const inactiveDays = daysSince(activity, now);
  if (inactiveDays < RETENTION_WARN_AFTER_DAYS) return "none";

  const warnedAt = t.retention_warning_sent_at ? new Date(t.retention_warning_sent_at) : null;
  const warnedAfterActivity = !!warnedAt && warnedAt.getTime() > new Date(activity).getTime();

  if (!warnedAfterActivity) return "warn";
  if (inactiveDays < RGPD_RETENTION_DAYS) return "none";
  const sinceWarn = (now.getTime() - warnedAt!.getTime()) / DAY_MS;
  return sinceWarn >= RETENTION_WARNING_DAYS ? "anonymize" : "none";
}

/** Date d'anonymisation annoncee dans l'email d'avertissement. */
export function anonymizationDate(t: RetentionTester, now: Date = new Date()): Date {
  const byActivity = new Date(new Date(lastActivityAt(t)).getTime() + RGPD_RETENTION_DAYS * DAY_MS);
  const byWarning = new Date(now.getTime() + RETENTION_WARNING_DAYS * DAY_MS);
  return byActivity > byWarning ? byActivity : byWarning;
}

/**
 * Champs ecrases a l'anonymisation. L'email reste UNIQUE et syntaxiquement
 * valide mais non routable (.invalid, RFC 2606). Le statut passe a
 * `inactive` pour sortir de toutes les listes staff et campagnes.
 */
export function anonymizedTesterPatch(testerId: string, now: Date = new Date()): Record<string, unknown> {
  const short = testerId.replace(/-/g, "").slice(0, 12);
  return {
    email: `anonyme-${short}@earlypanel.invalid`,
    first_name: "Compte",
    last_name: "anonymisé",
    phone: null,
    linkedin_url: null,
    address: null,
    city: null,
    postal_code: null,
    birth_date: null,
    phone_model: null,
    status: "inactive",
    profile_completed: false,
    available_until: null,
    anonymized_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Email d'avertissement, 90 jours avant anonymisation. */
export function buildRetentionWarningEmail(opts: {
  firstName: string | null;
  anonymizeOn: Date;
  loginUrl: string;
}): { subject: string; html: string } {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : "Bonjour,";
  const dateText = opts.anonymizeOn.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const subject = "Votre compte earlypanel sera anonymisé dans 90 jours";
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#0A7A5A;padding:24px 32px;">
          <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">early<span style="color:#2DD4A0;">panel</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">${greeting}</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 16px;">Vous ne vous êtes pas connecté(e) à votre espace testeur earlypanel depuis près de trois ans. Conformément à notre politique de confidentialité, nous ne conservons pas les données de profil au-delà de trois ans sans activité.</p>
          <p style="font-size:14px;color:#1d1d1f;line-height:1.6;margin:0 0 16px;">Sans connexion de votre part d'ici le <strong>${dateText}</strong>, votre compte sera anonymisé : identité, coordonnées, date de naissance et IBAN seront effacés définitivement. Vous ne recevrez plus aucune proposition de mission.</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 22px;">Pour conserver votre compte, il suffit de vous connecter une fois.</p>
          <a href="${opts.loginUrl}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Me connecter à mon espace →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:24px 0 0;">Si vous souhaitez que vos données soient effacées dès maintenant, vous pouvez ignorer cet email ou nous écrire à contact@earlypanel.fr.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · <a href="https://www.earlypanel.fr/confidentialite" style="color:#86868B;">Confidentialité</a> · <a href="https://www.earlypanel.fr/securite" style="color:#86868B;">Sécurité et données</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  return { subject, html };
}
