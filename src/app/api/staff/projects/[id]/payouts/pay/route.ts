import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

/**
 * POST : declenche les transferts Stripe Connect pour une ou plusieurs lignes de versement.
 * Body : { payout_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json();
  const payoutIds = body?.payout_ids as string[] | undefined;

  if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
    return NextResponse.json({ error: "payout_ids requis" }, { status: 400 });
  }

  const results: { payout_id: string; ok: boolean; error?: string; transfer_id?: string }[] = [];

  for (const payoutId of payoutIds) {
    const { data: payout } = await admin
      .from("tester_payouts")
      .select("id, project_id, tester_id, final_amount_cents, status, stripe_transfer_id")
      .eq("id", payoutId)
      .maybeSingle();

    if (!payout || payout.project_id !== projectId) {
      results.push({ payout_id: payoutId, ok: false, error: "Introuvable" });
      continue;
    }
    if (payout.status === "paid") {
      results.push({ payout_id: payoutId, ok: false, error: "Déjà payé" });
      continue;
    }
    if (payout.status === "failed") {
      await admin.from("tester_payouts").update({ status: "pending", last_error: null }).eq("id", payoutId);
    }

    const cents = payout.final_amount_cents ?? 0;

    if (cents <= 0) {
      await admin
        .from("tester_payouts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: true });
      continue;
    }

    if (!stripe) {
      results.push({ payout_id: payoutId, ok: false, error: "Stripe non configuré" });
      continue;
    }

    const { data: tester } = await admin
      .from("testers")
      .select("stripe_account_id, total_earned")
      .eq("id", payout.tester_id)
      .maybeSingle();

    const dest = tester?.stripe_account_id;
    if (!dest) {
      await admin
        .from("tester_payouts")
        .update({ last_error: "Compte Stripe Connect non configuré par le testeur" })
        .eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: false, error: "Pas de compte Stripe testeur" });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: cents,
          currency: "eur",
          destination: dest,
          metadata: {
            payout_id: payoutId,
            project_id: projectId,
            tester_id: payout.tester_id,
          },
        },
        { idempotencyKey: `tp_${payoutId}` }
      );

      const paidAt = new Date().toISOString();
      await admin
        .from("tester_payouts")
        .update({
          status: "paid",
          stripe_transfer_id: transfer.id,
          paid_at: paidAt,
          last_error: null,
        })
        .eq("id", payoutId);

      const prevEarned = Number(tester?.total_earned ?? 0);
      const addEuros = cents / 100;
      await admin
        .from("testers")
        .update({ total_earned: prevEarned + addEuros })
        .eq("id", payout.tester_id);

      results.push({ payout_id: payoutId, ok: true, transfer_id: transfer.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur Stripe";
      await admin.from("tester_payouts").update({ last_error: msg, status: "failed" }).eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results });
}
