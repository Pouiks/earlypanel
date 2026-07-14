import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens d'action signés (HMAC-SHA256) pour les liens email cliquables SANS
 * login — ex. campagne de disponibilité ("Oui je suis dispo" / "gérer mon
 * compte").
 *
 * Principe : le token encode `{ tester_id, action, exp }` et est signé avec
 * `ACTION_TOKEN_SECRET`. L'action est LIÉE cryptographiquement au token — pas
 * de paramètre `action` falsifiable en query. La route publique qui consomme
 * le token n'a pas besoin de session : l'identité vient du token vérifié.
 *
 * Fail-closed : sans `ACTION_TOKEN_SECRET`, la signature jette et la
 * vérification renvoie `null` (aucun token n'est jamais accepté).
 *
 * Ces tokens sont rejouables jusqu'à `exp` : à n'utiliser QUE pour des actions
 * idempotentes / non destructives (confirmer une dispo, atterrir sur une page).
 * Toute action destructive (désactiver/supprimer) reste en self-service
 * authentifié.
 */

export type ActionName = "availability_confirm" | "availability_manage";

interface Payload {
  tid: string;
  act: ActionName;
  exp: number; // secondes epoch
}

const DAY_SECONDS = 86_400;
const VALID_ACTIONS: ActionName[] = ["availability_confirm", "availability_manage"];

function getSecret(): string | undefined {
  return process.env.ACTION_TOKEN_SECRET?.trim() || undefined;
}

function hmac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/**
 * Signe un token d'action. Throw si `ACTION_TOKEN_SECRET` absent (fail-closed).
 * @param ttlSeconds durée de validité (défaut 90 jours = fenêtre de dispo).
 */
export function signActionToken(
  tid: string,
  act: ActionName,
  ttlSeconds: number = 90 * DAY_SECONDS,
): string {
  const secret = getSecret();
  if (!secret) throw new Error("ACTION_TOKEN_SECRET manquant — impossible de signer un token d'action");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ tid, act, exp })).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

/**
 * Vérifie un token d'action. Renvoie le payload si (signature valide + non
 * expiré + bien formé), sinon `null`. Comparaison timing-safe.
 */
export function verifyActionToken(token: string | null | undefined): Payload | null {
  const secret = getSecret();
  if (!secret || !token) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.tid !== "string" ||
    !payload.tid ||
    typeof payload.exp !== "number" ||
    !VALID_ACTIONS.includes(payload.act)
  ) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expiré

  return payload;
}
