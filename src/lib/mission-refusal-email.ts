/**
 * Email envoye au testeur quand le staff refuse une mission (travail bacle,
 * `staff_sloppy = true`) : la mission n'est pas payee, le score baisse, et
 * le testeur peut contester par email. Pure : testee dans
 * tests/unit/mission-refusal-email.test.ts.
 *
 * Le motif est la note saisie par le staff au moment de la notation. Elle
 * est affichee telle quelle (echappee) : le staff en est prevenu dans
 * l'interface de notation.
 */

export const REFUSAL_REASONS = [
  "réponses trop courtes ou vides",
  "réponses hors sujet par rapport à l'étape demandée",
  "réponses copiées d'une question à l'autre ou d'une source externe",
  "test visiblement non réalisé, ou réalisé sur un autre appareil que celui déclaré",
];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Note staff -> paragraphes HTML, sauts de ligne conserves. */
export function formatReason(note: string | null | undefined): string | null {
  const trimmed = (note ?? "").trim();
  if (!trimmed) return null;
  return escapeHtml(trimmed).replace(/\r?\n/g, "<br>");
}

export function buildMissionRefusedEmail(opts: {
  firstName: string | null;
  projectTitle: string;
  note: string | null;
  contactEmail: string;
  guideUrl: string;
}): { subject: string; html: string } {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : "Bonjour,";
  const title = escapeHtml(opts.projectTitle);
  const reason = formatReason(opts.note);
  const subject = `Votre mission « ${opts.projectTitle} » n'a pas été validée`;

  const reasonBlock = reason
    ? `<p style="font-size:14px;color:#1d1d1f;line-height:1.6;margin:0 0 6px;font-weight:600;">Motif indiqué par l'équipe</p>
          <p style="font-size:14px;color:#1d1d1f;line-height:1.6;margin:0 0 16px;padding:12px 14px;background:#f5f5f7;border-radius:10px;">${reason}</p>`
    : `<p style="font-size:14px;color:#1d1d1f;line-height:1.6;margin:0 0 6px;font-weight:600;">Ce qui fait refuser une mission</p>
          <ul style="font-size:14px;color:#1d1d1f;line-height:1.6;margin:0 0 16px;padding-left:20px;">${REFUSAL_REASONS.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`;

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
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 16px;">Nous avons relu vos réponses à la mission <strong style="color:#1d1d1f;">« ${title} »</strong>. Elles ne permettent pas de la valider : la mission n'est donc pas rémunérée.</p>
          ${reasonBlock}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 16px;">Un refus fait baisser votre score de qualité. Votre compte reste actif ; des refus répétés peuvent entraîner sa suspension.</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 22px;">Si vous estimez cette décision injustifiée, répondez à cet email ou écrivez à <a href="mailto:${escapeHtml(opts.contactEmail)}" style="color:#0A7A5A;">${escapeHtml(opts.contactEmail)}</a> : nous réexaminons vos réponses et vous répondons.</p>
          <a href="${escapeHtml(opts.guideUrl)}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Comment bien répondre à un test →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · <a href="https://www.earlypanel.fr/cgu" style="color:#86868B;">Conditions générales</a> · <a href="https://www.earlypanel.fr/securite" style="color:#86868B;">Sécurité et données</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}
