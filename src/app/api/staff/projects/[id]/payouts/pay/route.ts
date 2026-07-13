import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";
import { SIMULATED_TRANSFER_PREFIX } from "@/lib/payout-settlement";

/**
 * POST : INITIE le versement d'une ou plusieurs lignes.
 * Body : { payout_ids: string[] }
 *
 * Fiabilisation (cf. lib/payout-settlement.ts) :
 *   - Un versement a 0 € ne peut PAS etre "paye" : refus explicite.
 *   - Un versement sans destination (compte Stripe testeur) est refuse :
 *     jamais de "paid" sans moyen de paiement.
 *   - Cette route ne pose JAMAIS `paid`. Elle initie le transfert et laisse
 *     le versement "en cours" (status `pending` + `stripe_transfer_id`).
 *     Le passage a `paid` (+ credit total_earned) vient UNIQUEMENT du retour
 *     de paiement : vrai webhook Stripe `transfer.paid`, ou simulation via
 *     /payouts/simulate-stripe (dev). Voir settlePayoutPaid().
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

  // Simulation autorisee hors production uniquement : sans Stripe, on cree un
  // transfert simule dont le retour sera rejoue par /payouts/simulate-stripe.
  const allowSimulation = process.env.NODE_ENV !== "production";

  const results: {
    payout_id: string;
    ok: boolean;
    status?: "processing";
    simulated?: boolean;
    transfer_id?: string;
    error?: string;
  }[] = [];

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

    const cents = payout.final_amount_cents ?? 0;

    // Fiabilisation #1 : aucun versement a 0 € (ou negatif) n'est payable.
    // Un travail rejete / non remunere reste `pending` avec un montant nul et
    // s'affiche "Aucun versement dû" cote UI — jamais "Payé".
    if (cents <= 0) {
      results.push({
        payout_id: payoutId,
        ok: false,
        error: "Aucun montant à verser (0 €) — rien à payer",
      });
      continue;
    }

    // Destination du testeur (rail Stripe Connect).
    const { data: tester } = await admin
      .from("testers")
      .select("stripe_account_id")
      .eq("id", payout.tester_id)
      .maybeSingle();
    const dest = tester?.stripe_account_id;

    // Fiabilisation #2 : pas de destination = pas de paiement possible.
    if (!dest) {
      await admin
        .from("tester_payouts")
        .update({ last_error: "Coordonnées de paiement (compte Stripe) manquantes" })
        .eq("id", payoutId);
      results.push({
        payout_id: payoutId,
        ok: false,
        error: "Coordonnées de paiement du testeur manquantes",
      });
      continue;
    }

    // Retry : une ligne en echec repart de zero.
    if (payout.status === "failed") {
      await admin
        .from("tester_payouts")
        .update({ status: "pending", last_error: null })
        .eq("id", payoutId);
    }

    // ---- Cas Stripe reel configure ------------------------------------
    if (stripe) {
      // G8 : verifier que le compte connecte peut recevoir des transfers.
      try {
        const account = await stripe.accounts.retrieve(dest);
        const transfersCapability = account.capabilities?.transfers;
        const canReceive =
          account.payouts_enabled === true &&
          (transfersCapability === "active" || transfersCapability === undefined);
        if (!canReceive) {
          const reason = `Compte Stripe testeur non actif (payouts_enabled=${account.payouts_enabled}, transfers=${transfersCapability ?? "n/a"})`;
          await admin.from("tester_payouts").update({ last_error: reason }).eq("id", payoutId);
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
            metadata: { payout_id: payoutId, project_id: projectId, tester_id: payout.tester_id },
          },
          { idempotencyKey: `tp_${payoutId}` }
        );

        // NE PAS marquer paid ici : on enregistre le transfert et on reste "en
        // cours". Le webhook `transfer.paid` posera `paid` + creditera (une
        // seule fois, via settlePayoutPaid).
        await admin
          .from("tester_payouts")
          .update({ stripe_transfer_id: transfer.id, status: "pending", last_error: null })
          .eq("id", payoutId)
          .neq("status", "paid");

        results.push({ payout_id: payoutId, ok: true, status: "processing", transfer_id: transfer.id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur Stripe";
        await admin.from("tester_payouts").update({ last_error: msg, status: "failed" }).eq("id", payoutId);
        results.push({ payout_id: payoutId, ok: false, error: msg });
      }
      continue;
    }

    // ---- Stripe non configure -----------------------------------------
    if (!allowSimulation) {
      results.push({ payout_id: payoutId, ok: false, error: "Stripe non configuré" });
      continue;
    }

    // Simulation (dev) : transfert simule, en attente d'un retour simule.
    const simTransferId = `${SIMULATED_TRANSFER_PREFIX}${payoutId}`;
    await admin
      .from("tester_payouts")
      .update({ stripe_transfer_id: simTransferId, status: "pending", last_error: null })
      .eq("id", payoutId)
      .neq("status", "paid");
    results.push({
      payout_id: payoutId,
      ok: true,
      status: "processing",
      simulated: true,
      transfer_id: simTransferId,
    });
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "payout.pay_initiated",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        payout_count: payoutIds.length,
        initiated_count: results.filter((r) => r.ok).length,
        results,
      },
    },
    request
  );

  return NextResponse.json({ results });
}
