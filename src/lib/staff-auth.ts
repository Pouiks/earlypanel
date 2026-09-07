import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseJwks } from "@/lib/supabase-jwks";
import { STAFF_COOKIE_NAME, verifyStaffCookie } from "@/lib/staff-session-cookie";

/**
 * Auth staff cote serveur, zero reseau dans le cas nominal :
 *
 * 1. JWT verifie localement par `getClaims()` avec les cles publiques
 *    fournies par SUPABASE_JWKS (sinon le SDK les telecharge, ~100 ms sur
 *    une instance Edge neuve). Fallback `getUser()` si non verifiable.
 * 2. Ligne staff lue dans le cookie signe `tp-staff` pose par le middleware
 *    (TTL 2 min, meme fenetre que `tp-staff-ok`). Le cookie n'est accepte
 *    que si son `uid` est le `sub` du JWT verifie. Fallback : lecture
 *    `staff_members` + cache memoire 2 min.
 *
 * Compromis securite inchange (M6) : un staff revoque garde l'acces au plus
 * 2 min. Les deux helpers restent memoises par requete via React cache().
 */
const STAFF_CACHE_TTL_MS = 2 * 60 * 1000;

export interface StaffUser {
  id: string;
  email: string | null;
  app_metadata: Record<string, unknown>;
}

export interface StaffMember {
  id: string;
  email: string;
  auth_user_id: string;
  [key: string]: unknown;
}

const staffCache = new Map<string, { row: StaffMember; at: number }>();

export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const supabase = await createClient();

  let user: StaffUser | null = null;
  try {
    const keys = getSupabaseJwks();
    const { data, error } = await supabase.auth.getClaims(undefined, keys ? { keys } : undefined);
    if (!error && data?.claims?.sub) {
      const c = data.claims as { sub: string; email?: string; app_metadata?: Record<string, unknown> };
      user = { id: c.sub, email: c.email ?? null, app_metadata: c.app_metadata ?? {} };
    }
  } catch {
    /* fallback ci-dessous */
  }
  if (!user) {
    const { data: { user: full } } = await supabase.auth.getUser();
    if (!full) return null;
    user = { id: full.id, email: full.email ?? null, app_metadata: full.app_metadata ?? {} };
  }

  const role = user.app_metadata?.role;
  if (role !== "staff" && role !== "admin") return null;
  return user;
});

export const getStaffMember = cache(async (): Promise<StaffMember | null> => {
  const user = await getStaffUser();
  if (!user) return null;

  // 1. Cookie signe pose par le middleware (aucun acces DB).
  try {
    const jar = await cookies();
    const fromCookie = await verifyStaffCookie(jar.get(STAFF_COOKIE_NAME)?.value);
    if (fromCookie && fromCookie.uid === user.id) {
      return { id: fromCookie.sid, email: fromCookie.email, auth_user_id: fromCookie.uid };
    }
  } catch {
    /* pas de cookies() hors requete : on passe au fallback */
  }

  // 2. Cache memoire (utile en Node, peu fiable en Edge).
  const now = Date.now();
  const cached = staffCache.get(user.id);
  if (cached && now - cached.at < STAFF_CACHE_TTL_MS) return cached.row;

  // 3. Lecture DB.
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("staff_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();
  if (!data) return null;
  const row = data as StaffMember;
  staffCache.set(user.id, { row, at: now });
  return row;
});

/** Pour les tests / actions sensibles (revocation) : purge le cache staff. */
export function _resetStaffCache() {
  staffCache.clear();
}
