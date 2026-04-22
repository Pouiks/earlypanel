import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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

  if (eventType === "transfer.paid") {
    const transfer = event.data.object as import("stripe").Stripe.Transfer;
    const payoutId = transfer.metadata?.payout_id;
    if (payoutId) {
      const { data: existing } = await admin
        .from("tester_payouts")
        .select("id, status, tester_id, final_amount_cents")
        .eq("id", payoutId)
        .maybeSingle();

      if (existing && existing.status !== "paid") {
        await admin
          .from("tester_payouts")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", payoutId);

        const { data: tester } = await admin
          .from("testers")
          .select("total_earned")
          .eq("id", existing.tester_id)
          .maybeSingle();
        const prev = Number(tester?.total_earned ?? 0);
        const add = (existing.final_amount_cents ?? 0) / 100;
        await admin
          .from("testers")
          .update({ total_earned: prev + add })
          .eq("id", existing.tester_id);
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
    }
  }

  return NextResponse.json({ received: true });
}
