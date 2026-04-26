import type { NextRequest } from "next/server";

// W9 : protection CSRF basique en complement du SameSite=Lax des cookies
// Supabase. On verifie que les requetes mutantes ont bien un header Origin
// ou Referer qui matche l'URL publique de l'app. Cela bloque les attaques
// CSRF "navigateur classique" ou un site tiers tente d'envoyer une requete
// fetch/XHR avec les cookies de la victime.
//
// Limites : un attaquant qui controle un MITM peut forger ces headers.
// Pour aller plus loin, il faudrait des tokens CSRF par session.

function normalizeOrigin(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Verifie que la requete provient d'une origine de confiance.
 * Retourne true si la requete est legitime, false sinon.
 *
 * En dev (NODE_ENV !== "production"), on tolere une absence d'Origin/Referer
 * pour ne pas casser les tests locaux (curl, Postman) ; en prod on l'exige.
 */
export function checkOrigin(request: NextRequest): boolean {
  const expected = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || null);

  // Si APP_URL n'est pas configure, on ne peut pas verifier. En dev on laisse
  // passer, en prod ce sera bloque par le tryGetAppUrl() en amont.
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) return origin === expected;

  // Fallback Referer (certains navigateurs/extensions ne mettent pas Origin
  // sur des requetes same-origin POST/PATCH/DELETE).
  const referer = normalizeOrigin(request.headers.get("referer"));
  if (referer) return referer === expected;

  // Aucun header => en prod on refuse (probable script externe).
  return process.env.NODE_ENV !== "production";
}

/**
 * Renvoie une reponse 403 standardisee si l'origine est invalide.
 * Pattern d'usage :
 *   if (!checkOrigin(request)) return forbiddenOrigin();
 */
export function forbiddenOriginResponse() {
  return new Response(
    JSON.stringify({ error: "Origine non autorisee" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
