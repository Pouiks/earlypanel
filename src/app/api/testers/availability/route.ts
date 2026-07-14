import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyActionToken } from "@/lib/action-token";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GET /api/testers/availability?token=<signé>
 *
 * ROUTE PUBLIQUE (whitelist src/app/api/CLAUDE.md) atteinte via un clic HUMAIN
 * depuis la page interstitielle /app/auth/availability (les scanners email ne
 * cliquent pas le bouton → ils n'atteignent jamais cette route et ne brûlent
 * donc pas le magic link Supabase généré ici).
 *
 * Sécurité = token signé (HMAC) : PAS de session requise, PAS de checkOrigin.
 * Actions idempotentes / non destructives uniquement (l'action est liée au
 * token). Puis reconnecte le testeur via un magic link → son espace.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const appUrl = tryGetAppUrl() ?? origin;

  const payload = verifyActionToken(request.nextUrl.searchParams.get("token"));
  if (!payload) {
    return NextResponse.redirect(new URL("/app/login?availability=expired", origin));
  }

  // Anti-abus léger par IP (le token porte déjà l'identité).
  const ip = getClientIp(request);
  const rl = rateLimit(`availability:ip:${ip}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return NextResponse.redirect(new URL("/app/login?availability=ratelimited", origin));
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.redirect(new URL("/app/login?availability=error", origin));
  }

  const { data: tester } = await admin
    .from("testers")
    .select("*")
    .eq("id", payload.tid)
    .maybeSingle();
  if (!tester?.email) {
    return NextResponse.redirect(new URL("/app/login?availability=error", origin));
  }

  const nowIso = new Date().toISOString();
  let next = "/app/dashboard";

  if (payload.act === "availability_confirm") {
    const patch: Record<string, unknown> = {
      available_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      availability_responded_at: nowIso,
      updated_at: nowIso,
    };
    // "Je suis dispo" réactive un compte désactivé (si profil complet).
    if (tester.status === "inactive" && computeProfileCompleteness(tester).isComplete) {
      patch.status = "active";
    }
    await admin.from("testers").update(patch).eq("id", payload.tid);
    next = "/app/dashboard?availability=confirmed";
  } else {
    // availability_manage : on trace juste l'engagement, aucune mutation de dispo.
    await admin
      .from("testers")
      .update({ availability_responded_at: nowIso, updated_at: nowIso })
      .eq("id", payload.tid);
    next = "/app/dashboard/profil?section=disponibilite";
  }

  await logStaffAction(
    {
      staff_id: null,
      staff_email: tester.email,
      action: `tester.availability.email_${payload.act === "availability_confirm" ? "confirm" : "manage"}`,
      entity_type: "tester",
      entity_id: payload.tid,
    },
    request
  );

  // Magic link Supabase généré et consommé immédiatement par l'humain.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: tester.email,
    options: { redirectTo: `${appUrl}/app/auth/callback` },
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    // L'action a été enregistrée ; on renvoie vers le login si la reconnexion échoue.
    return NextResponse.redirect(new URL("/app/login?availability=done", origin));
  }

  const callback = new URL(`${appUrl}/app/auth/callback`);
  callback.searchParams.set("token_hash", hashedToken);
  callback.searchParams.set("type", "magiclink");
  callback.searchParams.set("next", next);
  return NextResponse.redirect(callback);
}
