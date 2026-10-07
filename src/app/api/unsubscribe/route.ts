import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyActionToken } from "@/lib/action-token";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * /api/unsubscribe?token=<signé>
 *
 * ROUTE PUBLIQUE (whitelist src/app/api/CLAUDE.md) : désabonnement de
 * l'ensemble des communications, cf. src/lib/email-unsubscribe.ts.
 *
 * POST : enregistre l'opposition (art. 21 RGPD). Deux appelants :
 *   - la page /desabonnement, ouverte par le lien en pied d'email ;
 *   - la messagerie (Gmail, Outlook, Apple Mail) via List-Unsubscribe-Post,
 *     corps `List-Unsubscribe=One-Click` (RFC 8058).
 *   Pas de session ni de checkOrigin : le POST en un clic vient d'un serveur
 *   tiers. Sécurité = token HMAC dont l'action est liée.
 *   Idempotent : un désabonnement existant garde sa date d'origine.
 *
 *   token `email_unsubscribe`         → testeur : email_opt_out_at + plus de
 *                                        disponibilité confirmée (plus aucune offre)
 *   token `email_unsubscribe_address` → adresse hors compte : ligne email_opt_outs
 *
 * GET : ne modifie rien, redirige vers la page.
 */
export async function POST(request: NextRequest) {
  const payload = verifyActionToken(request.nextUrl.searchParams.get("token"));
  if (!payload || (payload.act !== "email_unsubscribe" && payload.act !== "email_unsubscribe_address")) {
    return NextResponse.json({ error: "Lien de désabonnement invalide" }, { status: 400 });
  }

  // Le token porte l'identité : limite par IP (anti-bot) et par destinataire.
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`unsubscribe:ip:${ip}`, { windowMs: 60_000, max: 20 });
  if (!ipLimit.ok) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  const recipientLimit = rateLimit(`unsubscribe:recipient:${payload.tid}`, { windowMs: 3_600_000, max: 10 });
  if (!recipientLimit.ok) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const body = await request.text().catch(() => "");
  const via = body.includes("List-Unsubscribe=One-Click") ? "one_click" : "page";
  const nowIso = new Date().toISOString();

  if (payload.act === "email_unsubscribe") {
    const { data: updated, error } = await admin
      .from("testers")
      .update({ email_opt_out_at: nowIso, available_until: null, updated_at: nowIso })
      .eq("id", payload.tid)
      .is("email_opt_out_at", null)
      .select("id, email, status");
    if (error) {
      console.error("[unsubscribe] tester update error:", error.message);
      return NextResponse.json({ error: "Erreur lors du désabonnement" }, { status: 500 });
    }
    // Trace uniquement le désabonnement effectif (pas les rejeux du même lien).
    const row = updated?.[0];
    if (row) {
      await logStaffAction(
        {
          staff_id: null,
          staff_email: row.email,
          action: "email.unsubscribed",
          entity_type: "tester",
          entity_id: row.id,
          metadata: { via, status: row.status, opted_out_at: nowIso },
        },
        request
      );
    }
    return NextResponse.json({ ok: true, kind: "tester" });
  }

  const { data: inserted, error } = await admin
    .from("email_opt_outs")
    .upsert(
      { email_hash: payload.tid, opted_out_at: nowIso, source: via },
      { onConflict: "email_hash", ignoreDuplicates: true }
    )
    .select("email_hash");
  if (error) {
    console.error("[unsubscribe] address insert error:", error.message);
    return NextResponse.json({ error: "Erreur lors du désabonnement" }, { status: 500 });
  }
  if (inserted && inserted.length > 0) {
    await logStaffAction(
      {
        staff_id: null,
        staff_email: null,
        action: "email.unsubscribed",
        entity_type: "email_address",
        entity_id: null,
        metadata: { via, email_hash: payload.tid, opted_out_at: nowIso },
      },
      request
    );
  }
  return NextResponse.json({ ok: true, kind: "address" });
}

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const target = new URL("/desabonnement", tryGetAppUrl() ?? origin);
  const token = request.nextUrl.searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target);
}
