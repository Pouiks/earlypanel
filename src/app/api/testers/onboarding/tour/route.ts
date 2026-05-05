import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/testers/onboarding/tour
 *
 * Marque l'etat du tour guide pour le testeur courant.
 *
 * Body : { action: "completed" | "skipped" }
 *
 * - "completed" : l'utilisateur a fini le tour (clic sur "Commencer" a la
 *   derniere etape). On set `onboarding_tour_completed_at = now()`.
 * - "skipped"   : l'utilisateur a clique "Passer" pendant le tour. On set
 *   `onboarding_tour_skipped_at = now()`.
 *
 * Idempotent : si le timestamp est deja pose, on ne le re-update pas (on
 *   garde la 1ere valeur). Le bouton "?" relance le tour cote front sans
 *   passer par cette route.
 */
export async function POST(request: NextRequest) {
  const authed = await getAuthedTester();
  if (!authed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  if (action !== "completed" && action !== "skipped") {
    return NextResponse.json(
      { error: 'Action invalide (attendu "completed" ou "skipped")' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Configuration serveur manquante" },
      { status: 500 },
    );
  }

  const column =
    action === "completed"
      ? "onboarding_tour_completed_at"
      : "onboarding_tour_skipped_at";

  // Filtre `.is(column, null)` -> idempotent : on n'ecrase pas un timestamp
  // deja pose. Si l'utilisateur a deja fini, l'update est un no-op.
  const { error } = await admin
    .from("testers")
    .update({ [column]: new Date().toISOString() })
    .eq("id", authed.testerId)
    .is(column, null);

  if (error) {
    console.error("[onboarding/tour] update error:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'etat du tour" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
