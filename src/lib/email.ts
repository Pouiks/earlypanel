import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  toName?: string;
}

function getFrom(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return "testpanel <onboarding@resend.dev>";
}

export async function sendEmail({ to, subject, html, toName }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getFrom();

  const keyPreview = apiKey
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : "(absente)";
  console.log(
    `[Email] -> from="${from}" to="${to}" subject="${subject}" key=${keyPreview}`
  );

  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY manquante — email NON envoye:", {
      to,
      subject,
    });
    return { success: true, mock: true as const };
  }

  const resend = new Resend(apiKey);
  const toField = toName ? `${toName} <${to}>` : to;

  const { data, error } = await resend.emails.send({
    from,
    to: [toField],
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Resend a refuse l'envoi:", {
      to,
      subject,
      from,
      name: error.name,
      message: error.message,
    });
    throw new Error(`Resend: ${error.message}`);
  }

  console.log(`[Email] OK id=${data?.id} to="${to}"`);
  return { success: true, messageId: data?.id };
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
          <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">test<span style="color:#2DD4A0;">panel</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">${greeting}</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Votre inscription a bien été reçue.</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Cliquez ci-dessous pour accéder à votre espace et compléter votre profil.</p>
          <a href="${magicLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Compléter mon profil →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Ce lien est valable 24h. Si vous n'avez pas demandé cet accès, ignorez cet email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">testpanel · Made in France · <a href="https://testpanel.fr" style="color:#86868B;">Confidentialité</a> · <a href="https://testpanel.fr" style="color:#86868B;">CGU</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
