import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

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
 */
export async function getAuthedTester(): Promise<AuthedTester | null> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data: tester } = await admin
    .from("testers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tester) return null;
  return { authUserId: user.id, testerId: tester.id };
}
