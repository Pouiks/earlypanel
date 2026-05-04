import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifie l'auth + le role staff sur le JWT. Memoise par requete via
 * React cache() : si N composants ou routes l'appellent pendant le meme
 * cycle, un seul appel HTTP `auth.getUser()` est effectue.
 */
export const getStaffUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const role = user.app_metadata?.role;
  if (role !== "staff" && role !== "admin") return null;

  return user;
});

/**
 * Charge le row staff_members complet. Memoise idem.
 * Gain : ~200-500ms par appel evite quand plusieurs handlers/RSC l'utilisent
 * pendant la meme requete HTTP (cf. waterfall auth identifie en perf audit).
 */
export const getStaffMember = cache(async () => {
  const user = await getStaffUser();
  if (!user) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("staff_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return data;
});
