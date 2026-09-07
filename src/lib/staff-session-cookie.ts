/**
 * Cookie `tp-staff` : identite staff (id staff_members, email, auth uid)
 * signee HMAC-SHA256, posee par le middleware apres la verification DB.
 *
 * But : eviter une lecture `staff_members` a chaque requete API (sur Edge,
 * pas de cache memoire fiable). TTL court (STAFF_COOKIE_TTL_S) = meme
 * fenetre de revocation que `tp-staff-ok`. Secret : ACTION_TOKEN_SECRET.
 * WebCrypto uniquement : fonctionne en Edge (middleware) et en Node (API).
 */
export const STAFF_COOKIE_NAME = "tp-staff";
export const STAFF_COOKIE_TTL_S = 120;

export interface StaffCookiePayload {
  /** staff_members.id */
  sid: string;
  email: string;
  /** auth.users.id : doit correspondre au sub du JWT */
  uid: string;
  exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  // ArrayBuffer explicite : BufferSource refuse un SharedArrayBuffer potentiel.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function getSecret(): string | undefined {
  return process.env.ACTION_TOKEN_SECRET?.trim() || undefined;
}

export async function signStaffCookie(p: Omit<StaffCookiePayload, "exp">, ttlSeconds = STAFF_COOKIE_TTL_S): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const payload: StaffCookiePayload = { ...p, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyStaffCookie(value: string | null | undefined): Promise<StaffCookiePayload | null> {
  const secret = getSecret();
  if (!secret || !value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!body || !sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as StaffCookiePayload;
    if (!p || typeof p.sid !== "string" || typeof p.uid !== "string" || typeof p.exp !== "number") return null;
    if (p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}
