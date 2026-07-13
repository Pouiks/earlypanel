import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { settlePayoutPaid, settlePayoutFailed } from "@/lib/payout-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      // Reglement via la brique partagee (meme code que la simulation dev) :
      // transition atomique → paid + credit idempotent de total_earned.
      const res = await settlePayoutPaid(admin, { payoutId, transferId: transfer.id });
      if (res.ok && !res.alreadyPaid) {
        await logStaffAction({
          staff_id: null,
          staff_email: "stripe.webhook",
          action: "payout.paid",
          entity_type: "payout",
          entity_id: payoutId,
          metadata: { stripe_event_id: event.id, transfer_id: transfer.id, credited: res.credited },
        });
      }
    }
  }

  if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
    const transfer = event.data.object as import("stripe").Stripe.Transfer;
    const payoutId = transfer.metadata?.payout_id;
    if (payoutId) {
      // reversed = l'argent est repris apres coup → on annule le credit meme
      // si le versement etait deja paid. failed = echec avant credit.
      await settlePayoutFailed(admin, {
        payoutId,
        reason: eventType,
        revertCredit: eventType === "transfer.reversed",
      });

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
