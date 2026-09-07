/**
 * Cles publiques de signature des JWT Supabase (ES256), pour verifier les
 * jetons LOCALEMENT sans appel reseau.
 *
 * Source : variable d'env SUPABASE_JWKS = contenu JSON de
 *   https://<projet>.supabase.co/auth/v1/.well-known/jwks.json
 * Ce sont des cles PUBLIQUES (pas un secret) ; on les met en env plutot
 * qu'en dur pour survivre a une rotation de cle sans redeploiement de code.
 *
 * Sans la variable, on retourne undefined et le SDK Supabase fait lui-meme
 * le fetch (mis en cache 10 min par instance, mais sur Edge les instances
 * sont ephemeres : c'est ce qui coutait ~100 ms par requete).
 */
import type { JWK } from "@supabase/auth-js";

let cached: JWK[] | null | undefined;

export function getSupabaseJwks(): JWK[] | undefined {
  if (cached !== undefined) return cached ?? undefined;
  const raw = process.env.SUPABASE_JWKS?.trim();
  if (!raw) { cached = null; return undefined; }
  try {
    const parsed = JSON.parse(raw) as { keys?: JWK[] } | JWK[];
    const keys = Array.isArray(parsed) ? parsed : parsed.keys;
    cached = Array.isArray(keys) && keys.length > 0 ? keys : null;
  } catch {
    console.error("[supabase-jwks] SUPABASE_JWKS invalide (JSON attendu)");
    cached = null;
  }
  return cached ?? undefined;
}
