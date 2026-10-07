/**
 * Desabonnement de l'ensemble des communications (migration 047).
 *
 * Regle : tout email envoye a un testeur ou a un prospect passe par
 * sendUserEmail, jamais par sendEmail en direct (garde :
 * tests/unit/email-unsubscribe.test.ts). sendUserEmail :
 *   - ajoute en pied la ligne « Si vous souhaitez vous desabonner de
 *     l'ensemble des communications, cliquez ici » vers /desabonnement ;
 *   - ajoute les en-tetes List-Unsubscribe + List-Unsubscribe-Post (RFC 8058) :
 *     le bouton « Se desabonner » de Gmail / Outlook / Apple Mail fait un POST
 *     direct sur /api/unsubscribe ;
 *   - refuse l'envoi a une personne desabonnee, sauf email `requested`
 *     (demande par la personne a l'instant : lien de connexion, bienvenue
 *     apres inscription, exemple de rapport demande).
 *
 * Deux sortes de destinataires, deux sortes de liens signes (action-token) :
 *   - testeur  : token `email_unsubscribe`, identite = id testeur,
 *                opposition dans testers.email_opt_out_at ;
 *   - adresse  : token `email_unsubscribe_address`, identite = empreinte
 *                SHA-256 de l'adresse (jamais l'adresse en clair dans l'URL),
 *                opposition dans la table email_opt_outs.
 *
 * Seuls les emails internes au staff (connexion staff, recuperation,
 * notifications d'inscription et de brief) utilisent sendEmail en direct.
 */
import { createHash } from "node:crypto";
import { signActionToken } from "@/lib/action-token";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("email-unsubscribe");

const DAY_SECONDS = 86_400;

/**
 * Validite du lien : 5 ans. Un email relu longtemps apres doit toujours
 * permettre de se desabonner (couvre la retention : 3 ans d'inactivite puis
 * anonymisation).
 */
export const UNSUBSCRIBE_TOKEN_TTL_SECONDS = 5 * 365 * DAY_SECONDS;

export type EmailRecipient =
  | {
      kind: "tester";
      id: string;
      email: string | null;
      /**
       * Obligatoire : l'appelant doit avoir selectionne la colonne. `undefined`
       * (colonne oubliee dans le select) fait echouer l'envoi plutot que
       * d'ignorer un desabonnement.
       */
      email_opt_out_at: string | null | undefined;
    }
  | { kind: "address"; email: string };

export interface UnsubscribeLinks {
  /** Lien du pied d'email : page /desabonnement (desabonne a l'ouverture). */
  pageUrl: string;
  /** Cible de List-Unsubscribe : POST en un clic (RFC 8058). */
  oneClickUrl: string;
}

/** Empreinte d'une adresse email normalisee (trim + minuscules). */
export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Throw si ACTION_TOKEN_SECRET est absent. */
export function buildUnsubscribeLinks(appUrl: string, recipient: EmailRecipient): UnsubscribeLinks {
  const raw =
    recipient.kind === "tester"
      ? signActionToken(recipient.id, "email_unsubscribe", UNSUBSCRIBE_TOKEN_TTL_SECONDS)
      : signActionToken(emailHash(recipient.email), "email_unsubscribe_address", UNSUBSCRIBE_TOKEN_TTL_SECONDS);
  const token = encodeURIComponent(raw);
  return {
    pageUrl: `${appUrl}/desabonnement?token=${token}`,
    oneClickUrl: `${appUrl}/api/unsubscribe?token=${token}`,
  };
}

export function unsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Ligne de pied d'email, centree sous la carte, en petit gris. */
export function unsubscribeFooterHtml(url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 20px 32px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;font-size:11px;line-height:1.6;color:#86868B;">Si vous souhaitez vous désabonner de l'ensemble des communications, <a href="${url}" style="color:#86868B;text-decoration:underline;">cliquez ici</a>.</td></tr></table>`;
}

/** Insere la ligne juste avant </body>, ou a la fin pour un fragment HTML. */
export function withUnsubscribeFooter(html: string, url: string): string {
  const footer = unsubscribeFooterHtml(url);
  const i = html.lastIndexOf("</body>");
  return i === -1 ? `${html}${footer}` : `${html.slice(0, i)}${footer}${html.slice(i)}`;
}

export function hasOptedOutOfEmails(t: { email_opt_out_at?: string | null } | null | undefined): boolean {
  return !!t?.email_opt_out_at;
}

export class EmailOptOutError extends Error {
  constructor() {
    super("Destinataire désabonné de l'ensemble des communications");
    this.name = "EmailOptOutError";
  }
}

async function isAddressOptedOut(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Config serveur manquante : impossible de vérifier le désabonnement");
  const { data, error } = await admin
    .from("email_opt_outs")
    .select("email_hash")
    .eq("email_hash", emailHash(email))
    .maybeSingle();
  if (error) throw new Error(`Vérification du désabonnement impossible : ${error.message}`);
  return !!data;
}

/**
 * Envoie un email a un testeur ou a un prospect, avec la ligne et les
 * en-tetes de desabonnement.
 *
 * `requested` : email demande a l'instant par la personne. Il part meme si
 * elle s'est desabonnee, et, si le lien ne peut pas etre signe
 * (ACTION_TOKEN_SECRET absent), il part sans la ligne plutot que d'empecher
 * une connexion. Tout autre email est refuse dans ces deux cas.
 */
export async function sendUserEmail(opts: {
  recipient: EmailRecipient;
  appUrl: string;
  subject: string;
  html: string;
  toName?: string;
  attachments?: { filename: string; content: Buffer }[];
  requested?: boolean;
}) {
  const { recipient, requested = false } = opts;
  const to = recipient.email;
  if (!to) throw new Error("destinataire sans email");

  if (recipient.kind === "tester" && recipient.email_opt_out_at === undefined) {
    throw new Error("email_opt_out_at non sélectionné : envoi refusé");
  }
  if (!requested) {
    const optedOut =
      recipient.kind === "tester" ? hasOptedOutOfEmails(recipient) : await isAddressOptedOut(to);
    if (optedOut) throw new EmailOptOutError();
  }

  let links: UnsubscribeLinks | null = null;
  try {
    links = buildUnsubscribeLinks(opts.appUrl, recipient);
  } catch (err) {
    if (!requested) throw err;
    log.error("lien de désabonnement impossible à signer, email demandé envoyé sans", {
      subject: opts.subject,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return sendEmail({
    to,
    toName: opts.toName,
    subject: opts.subject,
    html: links ? withUnsubscribeFooter(opts.html, links.pageUrl) : opts.html,
    attachments: opts.attachments,
    ...(links ? { headers: unsubscribeHeaders(links.oneClickUrl) } : {}),
  });
}
