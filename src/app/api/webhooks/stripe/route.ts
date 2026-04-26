import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { centsToEuros } from "@/lib/reward-calculator";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("webhook/stripe");

/**
 * Webhook Stripe (transferts, comptes). Idempotent.
 * Configurer STRIPE_WEBHOOK_SECRET et l'URL /api/webhooks/stripe dans le dashboard Stripe.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[stripe webhook] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    // W10 : `constructEvent` verifie la signature ET la fraicheur du timestamp
    // (parametre `tolerance` du SDK Stripe = 300 sec par defaut). Tout event
    // dont l'horodatage signe est plus vieux que 5 min est rejete, ce qui
    // empeche les attaques par replay au-dela de cette fenetre. La dedup par
    // event.id (record_stripe_event RPC) couvre les replays a l'interieur.
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] verify:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Serveur" }, { status: 500 });
  }

  const eventType = event.type as string;

  // G8 : dedup par event.id. Stripe peut rejouer un meme webhook plusieurs
  // fois (retries reseau, redelivery manuel). On enregistre l'event.id dans
  // une table avec contrainte unique ; si le record existe deja, on retourne
  // 200 sans rejouer le traitement.
  const { data: isFirst, error: dedupErr } = await admin.rpc("record_stripe_event", {
    p_event_id: event.id,
    p_event_type: eventType,
  });
  if (dedupErr) {
    // Si la migration 021 n'est pas encore deployee, on log mais on continue
    // (best-effort) : Stripe redeliverera de toute facon en cas d'echec.
    console.warn("[stripe webhook] record_stripe_event RPC indispo:", dedupErr.message);
  } else if (isFirst === false) {
    log.info("event already processed, skipping", { event_id: event.id });
    return NextResponse.json({ received: true, deduplicated: true });
  }

  if (eventType === "transfer.paid") {
    const transfer = event.data.object as import("stripe").Stripe.Transfer;
    const payoutId = transfer.metadata?.payout_id;
    if (payoutId) {
      const { data: existing } = await admin
        .from("tester_payouts")
        .select("id, status, tester_id, final_amount_cents")
        .eq("id", payoutId)
        .maybeSingle();

      if (existing) {
        // G6 : marque "paid" de maniere atomique : ne change que si pas deja paid.
        await admin
          .from("tester_payouts")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", payoutId)
          .neq("status", "paid");

        // G8 : credit idempotent via ledger (un seul credit par payout_id),
        // peu importe combien de fois pay/route.ts ET le webhook tentent de
        // crediter le meme payout.
        const amountEuros = centsToEuros(existing.final_amount_cents ?? 0);
        const { error: creditErr } = await admin.rpc("credit_tester_earnings", {
          p_payout_id: payoutId,
          p_tester_id: existing.tester_id,
          p_amount_euros: amountEuros,
        });
        if (creditErr) {
          // Fallback non-idempotent (race possible) si la migration 021 n'est
          // pas deployee. On verifie au moins que le payout n'etait pas deja
          // paye pour limiter la double comptabilisation.
          console.warn("[stripe webhook] credit_tester_earnings RPC indispo, fallback:", creditErr.message);
          if (existing.status !== "paid") {
            const { data: tester } = await admin
              .from("testers")
              .select("total_earned")
              .eq("id", existing.tester_id)
              .maybeSingle();
            const prev = Number(tester?.total_earned ?? 0);
            await admin
              .from("testers")
              .update({ total_earned: prev + amountEuros })
              .eq("id", existing.tester_id);
          }
        }
      }
    }
  }

  if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
    const transfer = event.data.object as import("stripe").Stripe.Transfer;
    const payoutId = transfer.metadata?.payout_id;
    if (payoutId) {
      await admin
        .from("tester_payouts")
        .update({
          status: "failed",
          last_error: eventType,
        })
        .eq("id", payoutId)
        .neq("status", "paid");

      // G8 : sur un transfer.reversed, on annule le credit total_earned
      // (best-effort via RPC). Sur transfer.failed, le credit n'a normalement
      // pas eu lieu mais on tente quand meme la reversion (no-op si rien).
      const { error: revErr } = await admin.rpc("revert_tester_earnings", {
        p_payout_id: payoutId,
      });
      if (revErr) {
        console.warn("[stripe webhook] revert_tester_earnings RPC indispo:", revErr.message);
      }

      await logStaffAction({
        staff_id: null,
        staff_email: "stripe.webhook",
        action: `payout.${eventType}`,
        entity_type: "payout",
        entity_id: payoutId,
        metadata: { stripe_event_id: event.id, transfer_id: transfer.id },
      });
    }
  }

  return NextResponse.json({ received: true });
}
