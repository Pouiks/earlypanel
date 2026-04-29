import { NextResponse } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/testers/session
 *
 * Endpoint leger pour le bandeau de navigation : retourne juste si la
 * session testeur est active et 2 champs publics pour l'affichage du
 * bouton "Mon espace" sur la landing.
 *
 * Aucune donnee sensible : on n'expose ni email, ni IBAN, ni profil.
 *   { authenticated: false } si pas connecte
 *   { authenticated: true, first_name, profile_completed } sinon
 *
 * Pas de cache : la session peut changer (login/logout) et il faut que
 * le bandeau soit a jour rapidement.
 */
export async function GET() {
  const tester = await getAuthedTester();
  if (!tester) {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data } = await admin
    .from("testers")
    .select("first_name, profile_completed")
    .eq("id", tester.testerId)
    .maybeSingle();

  return NextResponse.json(
    {
      authenticated: true,
      first_name: data?.first_name ?? null,
      profile_completed: data?.profile_completed ?? false,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
