import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { centsToEuros } from "@/lib/reward-calculator";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";

/**
 * POST : declenche les transferts Stripe Connect pour une ou plusieurs lignes de versement.
 * Body : { payout_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // W9 : protection CSRF (Origin/Referer check) sur les actions financieres.
  if (!checkOrigin(request)) return forbiddenOriginResponse();

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
        .update({ last_error: "Compte Stripe Connect non configure par le testeur" })
        .eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: false, error: "Pas de compte Stripe testeur" });
      continue;
    }

    // G8 : verifier que le compte connecte peut recevoir des transfers
    // AVANT d'appeler transfers.create. Sinon Stripe lance une erreur opaque
    // et le payout reste en "failed" sans message clair pour l'operateur.
    try {
      const account = await stripe.accounts.retrieve(dest);
      const transfersCapability = account.capabilities?.transfers;
      const canReceive =
        account.payouts_enabled === true &&
        (transfersCapability === "active" || transfersCapability === undefined);
      if (!canReceive) {
        const reason = `Compte Stripe testeur non actif (payouts_enabled=${account.payouts_enabled}, transfers=${transfersCapability ?? "n/a"})`;
        await admin
          .from("tester_payouts")
          .update({ last_error: reason })
          .eq("id", payoutId);
        results.push({ payout_id: payoutId, ok: false, error: reason });
        continue;
      }
    } catch (accErr) {
      const msg = accErr instanceof Error ? accErr.message : "Erreur Stripe accounts";
      await admin
        .from("tester_payouts")
        .update({ last_error: `Verification compte: ${msg}` })
        .eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: false, error: msg });
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
      // G6 : transition atomique vers paid (evite double credit si le webhook
      // arrive en parallele).
      await admin
        .from("tester_payouts")
        .update({
          status: "paid",
          stripe_transfer_id: transfer.id,
          paid_at: paidAt,
          last_error: null,
        })
        .eq("id", payoutId)
        .neq("status", "paid");

      // G8 : credit idempotent par payout_id (un seul credit possible meme si
      // pay/route.ts et webhook transfer.paid s'executent tous deux).
      const addEuros = centsToEuros(cents);
      const { error: creditErr } = await admin.rpc("credit_tester_earnings", {
        p_payout_id: payoutId,
        p_tester_id: payout.tester_id,
        p_amount_euros: addEuros,
      });
      if (creditErr) {
        // Fallback compat : si la migration 021 n'est pas deployee, on credite
        // de maniere non-idempotente. Le webhook a aussi un fallback symmetrique.
        console.warn("[payouts/pay] credit_tester_earnings RPC indispo, fallback:", creditErr.message);
        const prevEarned = Number(tester?.total_earned ?? 0);
        await admin
          .from("testers")
          .update({ total_earned: prevEarned + addEuros })
          .eq("id", payout.tester_id);
      }

      results.push({ payout_id: payoutId, ok: true, transfer_id: transfer.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur Stripe";
      await admin.from("tester_payouts").update({ last_error: msg, status: "failed" }).eq("id", payoutId);
      results.push({ payout_id: payoutId, ok: false, error: msg });
    }
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "payout.pay",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        payout_count: payoutIds.length,
        success_count: results.filter((r) => r.ok).length,
        results,
      },
    },
    request
  );

  return NextResponse.json({ results });
}
