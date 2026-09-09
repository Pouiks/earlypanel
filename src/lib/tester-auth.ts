import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldStampSeen } from "@/lib/tester-activity";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* readonly */
          }
        },
      },
    }
  );
}

export interface AuthedTester {
  authUserId: string;
  testerId: string;
}

/**
 * Authentifie le testeur et retourne son id (table testers).
 * Retourne null si non authentifie ou profil introuvable.
 *
 * Memoise par requete via React cache() : si plusieurs composants ou
 * routes appellent getAuthedTester() pendant le meme cycle de requete,
 * un seul appel reseau + DB est effectue. Gain : ~200-500ms par appel
 * eveite (cf. waterfall auth identifie en optimisation perf).
 */
export const getAuthedTester = cache(async (): Promise<AuthedTester | null> => {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data: tester } = await admin
    .from("testers")
    .select("id, last_seen_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tester) return null;

  // Derniere activite (migration 043) : au plus une ecriture par heure,
  // apres l'envoi de la reponse. Jamais bloquant, jamais fatal : une
  // trace d'activite manquee ne doit pas casser une requete metier.
  if (shouldStampSeen(tester.last_seen_at)) {
    const stamp = async () => {
      await admin
        .from("testers")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", tester.id);
    };
    try {
      after(stamp);
    } catch {
      // Hors contexte de requete (ex. script) : on tente quand meme, sans attendre.
      void stamp().catch(() => {});
    }
  }

  return { authUserId: user.id, testerId: tester.id };
});
