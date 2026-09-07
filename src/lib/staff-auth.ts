import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth staff cote serveur, optimisee pour la latence Vercel -> Supabase.
 *
 * 1. `getClaims()` verifie le JWT localement (JWKS mis en cache par le SDK,
 *    au niveau module) au lieu d'appeler Supabase Auth a chaque requete.
 *    Si le projet utilise encore une cle HS256 ou si le jeton est expire,
 *    le SDK retombe sur un appel reseau (comportement identique a avant).
 * 2. La ligne `staff_members` est mise en cache en memoire par utilisateur
 *    pendant STAFF_CACHE_TTL_MS (meme fenetre que le cookie `tp-staff-ok`
 *    du middleware). Un staff revoque garde donc l'acces API au plus 2 min
 *    sur une instance chaude — compromis deja accepte cote middleware (M6).
 *
 * Les deux helpers restent memoises par requete via React cache().
 */
const STAFF_CACHE_TTL_MS = 2 * 60 * 1000;

export interface StaffUser {
  id: string;
  email: string | null;
  app_metadata: Record<string, unknown>;
}

type StaffRow = Record<string, unknown> & { id: string; email: string };

const staffCache = new Map<string, { row: StaffRow | null; at: number }>();

export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const supabase = await createClient();

  let user: StaffUser | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
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

export const getStaffMember = cache(async () => {
  const user = await getStaffUser();
  if (!user) return null;

  const now = Date.now();
  const cached = staffCache.get(user.id);
  if (cached && now - cached.at < STAFF_CACHE_TTL_MS) return cached.row;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("staff_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  // On ne met en cache que les succes : un null (staff revoque) est reverifie
  // a chaque requete.
  if (data) staffCache.set(user.id, { row: data as StaffRow, at: now });
  return (data as StaffRow | null) ?? null;
});

/** Pour les tests / actions sensibles (revocation) : purge le cache staff. */
export function _resetStaffCache() {
  staffCache.clear();
}
