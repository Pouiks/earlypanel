import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";
import { settlePayoutPaid, settlePayoutFailed, SIMULATED_TRANSFER_PREFIX } from "@/lib/payout-settlement";

/**
 * POST : SIMULE le retour de paiement Stripe (dev uniquement).
 *
 * Body : { payout_id: string, outcome: "paid" | "failed" | "reversed" }
 *
 * Rejoue EXACTEMENT la logique du vrai webhook Stripe (settlePayoutPaid /
 * settlePayoutFailed) sans Stripe reel. Permet de derouler le cycle complet
 * en local : pay (→ en cours) → simulate paid (→ payé + crédité) OU simulate
 * failed/reversed (→ échec + reversal du crédit).
 *
 * Quand le vrai webhook Stripe sera cable, cet endpoint n'est plus necessaire
 * en prod : il est donc REFUSE en production (fail-closed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Simulation indisponible en production (utilisez le vrai webhook Stripe)" },
      { status: 403 }
    );
  }

  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json().catch(() => null);
  const payoutId = body?.payout_id as string | undefined;
  const outcome = body?.outcome as string | undefined;

  if (!payoutId || !["paid", "failed", "reversed"].includes(outcome ?? "")) {
    return NextResponse.json(
      { error: "payout_id et outcome ('paid' | 'failed' | 'reversed') requis" },
      { status: 400 }
    );
  }

  const { data: payout } = await admin
    .from("tester_payouts")
    .select("id, project_id, stripe_transfer_id, status")
    .eq("id", payoutId)
    .maybeSingle();

  if (!payout || payout.project_id !== projectId) {
    return NextResponse.json({ error: "Versement introuvable" }, { status: 404 });
  }
  if (!payout.stripe_transfer_id) {
    return NextResponse.json(
      { error: "Aucun transfert initié pour ce versement — lancez d'abord le paiement" },
      { status: 409 }
    );
  }

  const transferId = payout.stripe_transfer_id ?? `${SIMULATED_TRANSFER_PREFIX}${payoutId}`;

  let settled;
  if (outcome === "paid") {
    settled = await settlePayoutPaid(admin, { payoutId, transferId });
  } else {
    settled = await settlePayoutFailed(admin, {
      payoutId,
      reason: `simulated.transfer.${outcome}`,
      revertCredit: outcome === "reversed",
    });
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: `payout.simulated_${outcome}`,
      entity_type: "tester_payout",
      entity_id: payoutId,
      metadata: { project_id: projectId, transfer_id: transferId, settled },
    },
    request
  );

  const { data: after } = await admin
    .from("tester_payouts")
    .select("id, status, paid_at, final_amount_cents, stripe_transfer_id, last_error")
    .eq("id", payoutId)
    .maybeSingle();

  return NextResponse.json({ success: true, outcome, settled, payout: after });
}
