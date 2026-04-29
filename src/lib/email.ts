import { Resend } from "resend";
import { logger } from "@/lib/logger";

const log = logger("email");

interface Attachment {
  filename: string;
  content: Buffer;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  toName?: string;
  attachments?: Attachment[];
}

function getFrom(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return "earlypanel <noreply@earlypanel.fr>";
}

export async function sendEmail({ to, subject, html, toName, attachments }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getFrom();

  const keyPreview = apiKey
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : "(absente)";
  log.info("send attempt", { from, to, subject, key_preview: keyPreview });

  if (!apiKey) {
    log.warn("RESEND_API_KEY manquante — email NON envoye", { to, subject });
    return { success: true, mock: true as const };
  }

  const resend = new Resend(apiKey);
  const toField = toName ? `${toName} <${to}>` : to;

  const { data, error } = await resend.emails.send({
    from,
    to: [toField],
    subject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    log.error("Resend a refuse l'envoi", {
      to,
      subject,
      from,
      name: error.name,
      message: error.message,
    });
    throw new Error(`Resend: ${error.message}`);
  }

  log.info("sent", { id: data?.id, to });
  return { success: true, messageId: data?.id };
}

export function buildLeadMagnetEmail(): string {
  return `
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
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">Votre exemple de rapport earlypanel</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Merci pour votre intérêt !</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Vous trouverez en pièce jointe un exemple complet de rapport earlypanel : KPIs, verbatims, carte des frictions et recommandations actionnables.</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Une question ? Répondez directement à cet email.</p>
          <a href="https://earlypanel.fr/entreprises" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Découvrir nos formules →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · Made in France · <a href="https://earlypanel.fr" style="color:#86868B;">Confidentialité</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Email de notification interne envoye au staff a chaque nouvelle
 * inscription au panel testeur. Sert d'alerte temps reel pour suivre
 * la croissance du panel pendant la phase de pre-lancement.
 *
 * Affiche un score de completude (X/18 champs requis pour activation)
 * pour evaluer en un coup d'oeil la qualite de l'inscription.
 */
export function buildNewTesterAdminEmail(opts: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  ip?: string | null;
  source?: string | null;
  prefilledFields?: {
    sector?: string | null;
    digital_level?: string | null;
    availability?: string | null;
  };
}): string {
  const fullName = [opts.firstName, opts.lastName].filter(Boolean).join(" ") || "(non renseigne)";
  const ip = opts.ip || "(inconnue)";
  const source = opts.source || "(non renseignee)";
  const timestamp = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  // Calcul de completude : nombre de champs DB requis remplis / 18 total.
  // Aligne sur le trigger DB auto_activate_tester (cf. migration 026).
  const REQUIRED_FIELDS_TOTAL = 18;
  const filledAtRegistration: { key: string; label: string; value: string }[] = [];
  if (opts.firstName) filledAtRegistration.push({ key: "first_name", label: "Prénom", value: opts.firstName });
  if (opts.lastName) filledAtRegistration.push({ key: "last_name", label: "Nom", value: opts.lastName });
  if (opts.prefilledFields?.sector) {
    filledAtRegistration.push({ key: "sector", label: "Secteur", value: opts.prefilledFields.sector });
  }
  if (opts.prefilledFields?.digital_level) {
    filledAtRegistration.push({ key: "digital_level", label: "Niveau digital", value: opts.prefilledFields.digital_level });
  }
  if (opts.prefilledFields?.availability) {
    filledAtRegistration.push({ key: "availability", label: "Disponibilité", value: opts.prefilledFields.availability });
  }
  const filledCount = filledAtRegistration.length;
  const completionPct = Math.round((filledCount / REQUIRED_FIELDS_TOTAL) * 100);
  const missingCount = REQUIRED_FIELDS_TOTAL - filledCount;

  const filledRowsHtml = filledAtRegistration.length === 0
    ? `<tr><td style="padding:6px 0;color:#86868B;font-style:italic;" colspan="2">Aucun champ pré-rempli (l'utilisateur n'a fourni que son email)</td></tr>`
    : filledAtRegistration.map((f) =>
        `<tr><td style="padding:5px 0;color:#86868B;width:140px;">${escapeHtml(f.label)}</td><td style="padding:5px 0;font-weight:500;">${escapeHtml(f.value)}</td></tr>`
      ).join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:0.5px solid rgba(0,0,0,0.08);">
        <tr><td style="background:#0A7A5A;padding:18px 24px;">
          <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:0.04em;text-transform:uppercase;">earlypanel · admin</span>
        </td></tr>
        <tr><td style="padding:28px 24px 18px;">
          <p style="font-size:15px;color:#1d1d1f;margin:0 0 4px;font-weight:700;">Nouvelle inscription au panel</p>
          <p style="font-size:12px;color:#86868B;margin:0;">${escapeHtml(timestamp)}</p>
        </td></tr>

        <tr><td style="padding:0 24px 18px;">
          <p style="font-size:11px;font-weight:700;color:#86868B;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 10px;">Identité</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1d1d1f;">
            <tr><td style="padding:5px 0;color:#86868B;width:140px;">Nom</td><td style="padding:5px 0;font-weight:600;">${escapeHtml(fullName)}</td></tr>
            <tr><td style="padding:5px 0;color:#86868B;">Email</td><td style="padding:5px 0;font-weight:600;"><a href="mailto:${escapeHtml(opts.email)}" style="color:#0A7A5A;text-decoration:none;">${escapeHtml(opts.email)}</a></td></tr>
            <tr><td style="padding:5px 0;color:#86868B;">Source</td><td style="padding:5px 0;">${escapeHtml(source)}</td></tr>
            <tr><td style="padding:5px 0;color:#86868B;">IP</td><td style="padding:5px 0;color:#6e6e73;font-family:monospace;font-size:12px;">${escapeHtml(ip)}</td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 24px 18px;">
          <p style="font-size:11px;font-weight:700;color:#86868B;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 10px;">Champs pré-remplis (depuis la landing)</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1d1d1f;">
            ${filledRowsHtml}
          </table>
        </td></tr>

        <tr><td style="padding:0 24px 24px;">
          <div style="background:#f5f5f7;border-radius:10px;padding:14px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
              <tr>
                <td style="font-size:12px;font-weight:700;color:#1d1d1f;">Profil complet pour activation</td>
                <td style="font-size:13px;font-weight:700;color:#0A7A5A;text-align:right;">${filledCount} / ${REQUIRED_FIELDS_TOTAL}</td>
              </tr>
            </table>
            <div style="background:#fff;border-radius:980px;height:6px;overflow:hidden;">
              <div style="background:#0A7A5A;height:100%;width:${completionPct}%;"></div>
            </div>
            <p style="font-size:11px;color:#86868B;margin:8px 0 0;line-height:1.5;">
              Statut actuel : <strong>pending</strong>. Il manque <strong>${missingCount}</strong> champ${missingCount > 1 ? "s" : ""} avant activation automatique. Le testeur recevra un email avec un magic link pour compléter son profil et passer en <strong>active</strong>.
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Echappe les caracteres HTML pour eviter une injection via les champs
 * fournis par l'utilisateur (nom, email, source) dans l'email admin.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildWelcomeEmail(magicLink: string, firstName?: string): string {
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  return `
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
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Merci ! Votre profil est enregistré dans notre panel testeurs.</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 22px;">Cliquez ci-dessous pour compléter votre profil et le rendre éligible aux missions.</p>
          <a href="${magicLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Compléter mon profil →</a>

          <div style="margin:32px 0 0;padding:16px 18px;background:#fef3c7;border-radius:12px;border-left:3px solid #f59e0b;">
            <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0 0 6px;font-weight:600;">À savoir avant de continuer</p>
            <p style="font-size:12px;color:#92400e;line-height:1.6;margin:0;">
              earlypanel est en <strong>phase de pré-lancement</strong>. La fréquence des missions dépend de votre profil et de la demande client : <strong>aucune mission n'est garantie</strong>. Vous serez contacté(e) par email dès qu'une opportunité correspond à votre profil.
            </p>
          </div>

          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:24px 0 0;">Ce lien de connexion est valable 24h. Si vous n'avez pas demandé cet accès, ignorez cet email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · Made in France · <a href="https://earlypanel.fr/confidentialite" style="color:#86868B;">Confidentialité</a> · <a href="https://earlypanel.fr/cgu" style="color:#86868B;">CGU</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
