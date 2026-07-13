import type { SupabaseClient } from "@supabase/supabase-js";
import { centsToEuros } from "@/lib/reward-calculator";

/**
 * Reglement des versements testeur — source de verite UNIQUE du passage
 * a `paid`.
 *
 * Principe (fiabilisation) : un versement n'est `paid` QUE lorsqu'un retour
 * de paiement confirme le transfert. Ce retour vient :
 *   - du vrai webhook Stripe (`transfer.paid` / `transfer.failed` / `reversed`)
 *   - OU de l'endpoint de simulation (dev) qui rejoue exactement la meme
 *     logique sans Stripe reel.
 *
 * Les deux appellent ces fonctions. `payouts/pay` ne pose PLUS `paid`
 * lui-meme : il initie le transfert et laisse le versement "en cours"
 * (status `pending` + `stripe_transfer_id` renseigne), en attente du retour.
 *
 * Le credit `total_earned` est idempotent (ledger `tester_earnings_ledger`,
 * migration 021) : un payout ne peut etre credite qu'une seule fois, peu
 * importe combien de fois la confirmation arrive.
 */

// Prefixe des transfer id simules (aucun appel Stripe reel). Permet de
// distinguer un reglement de test d'un vrai transfert dans les logs/audit.
export const SIMULATED_TRANSFER_PREFIX = "sim_tr_";

export function isSimulatedTransfer(transferId: string | null | undefined): boolean {
  return typeof transferId === "string" && transferId.startsWith(SIMULATED_TRANSFER_PREFIX);
}

type Admin = SupabaseClient;

interface SettleResult {
  ok: boolean;
  reason?: "not_found";
  /** true si le versement etait deja `paid` (retour idempotent, pas de rejeu). */
  alreadyPaid?: boolean;
  credited?: boolean;
}

/**
 * Confirme un versement : passage `pending`/en cours → `paid` (atomique,
 * anti double-transition) puis credit idempotent de `total_earned`.
 */
export async function settlePayoutPaid(
  admin: Admin,
  { payoutId, transferId }: { payoutId: string; transferId: string },
): Promise<SettleResult> {
  const { data: payout } = await admin
    .from("tester_payouts")
    .select("id, status, tester_id, final_amount_cents")
    .eq("id", payoutId)
    .maybeSingle();

  if (!payout) return { ok: false, reason: "not_found" };

  // Transition atomique : ne bascule que si pas deja paid (idempotent si le
  // webhook et la simulation arrivent tous deux).
  const { data: updated } = await admin
    .from("tester_payouts")
    .update({
      status: "paid",
      stripe_transfer_id: transferId,
      paid_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", payoutId)
    .neq("status", "paid")
    .select("id");

  const alreadyPaid = !updated || updated.length === 0;

  // Credit idempotent (un seul credit par payout_id via le ledger).
  const amountEuros = centsToEuros(payout.final_amount_cents ?? 0);
  let credited = false;
  const { data: creditResult, error: creditErr } = await admin.rpc("credit_tester_earnings", {
    p_payout_id: payoutId,
    p_tester_id: payout.tester_id,
    p_amount_euros: amountEuros,
  });
  if (creditErr) {
    // Fallback si la migration 021 (ledger) n'est pas deployee : credit
    // best-effort, uniquement si le versement n'etait pas deja paid (limite
    // le risque de double comptage sans la garantie du ledger).
    console.warn("[payout-settlement] credit_tester_earnings RPC indispo, fallback:", creditErr.message);
    if (!alreadyPaid && amountEuros > 0) {
      const { data: tester } = await admin
        .from("testers")
        .select("total_earned")
        .eq("id", payout.tester_id)
        .maybeSingle();
      const prev = Number(tester?.total_earned ?? 0);
      await admin.from("testers").update({ total_earned: prev + amountEuros }).eq("id", payout.tester_id);
      credited = true;
    }
  } else {
    credited = creditResult === true;
  }

  return { ok: true, alreadyPaid, credited };
}

/**
 * Marque un versement en echec (`transfer.failed` / `transfer.reversed`).
 * Ne touche pas un versement deja `paid` SAUF si `revertCredit` est demande
 * (cas `reversed` : l'argent est repris apres coup).
 */
export async function settlePayoutFailed(
  admin: Admin,
  { payoutId, reason, revertCredit }: { payoutId: string; reason: string; revertCredit?: boolean },
): Promise<SettleResult> {
  const { data: payout } = await admin
    .from("tester_payouts")
    .select("id")
    .eq("id", payoutId)
    .maybeSingle();
  if (!payout) return { ok: false, reason: "not_found" };

  if (revertCredit) {
    // Reversal : on annule d'abord le credit (idempotent : no-op si jamais
    // credite), puis on repasse le versement en failed meme s'il etait paid.
    const { error: revErr } = await admin.rpc("revert_tester_earnings", { p_payout_id: payoutId });
    if (revErr) console.warn("[payout-settlement] revert_tester_earnings RPC indispo:", revErr.message);
    await admin
      .from("tester_payouts")
      .update({ status: "failed", last_error: reason })
      .eq("id", payoutId);
  } else {
    // Echec simple : ne pas ecraser un versement deja paid.
    await admin
      .from("tester_payouts")
      .update({ status: "failed", last_error: reason })
      .eq("id", payoutId)
      .neq("status", "paid");
  }

  return { ok: true };
}
