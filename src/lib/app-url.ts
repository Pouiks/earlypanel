// W8 : helper centralise pour resoudre l'URL publique de l'app.
// En production, l'absence de NEXT_PUBLIC_APP_URL est une erreur de
// configuration : si on tombait silencieusement sur localhost:3000, les
// magic links et autres callbacks renverraient les utilisateurs vers une
// URL inutilisable.

/**
 * Retourne l'URL publique de l'app.
 * - En dev : fallback sur http://localhost:3000 si la variable manque.
 * - En prod : throw si la variable manque (fail-fast).
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required in production but was not provided"
    );
  }
  return "http://localhost:3000";
}

/**
 * Variante non-throwing : retourne null si manquante en prod, fallback en dev.
 * Utile dans les routes qui veulent retourner un 500 controle plutot que
 * laisser remonter une exception.
 */
export function tryGetAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === "production") return null;
  return "http://localhost:3000";
}
