import { NextRequest, NextResponse, after } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";

/**
 * POST /api/staff/payouts/mark-paid
 *
 * Body : { sepa_batch_ref?: string, payout_ids?: string[] }
 *
 * Soit on marque tout un batch (par sepa_batch_ref), soit une liste explicite.
 * Au moins l'un des deux est requis.
 *
 * Workflow :
 *   1. Cible les lignes status pending|approved avec exported_at non-null
 *   2. Update : status='paid', paid_at=now()
 *   3. Audit log (qui, quand, batch_ref, montants)
 *   4. Envoi email confirmation a chaque testeur (via after(), non-bloquant)
 */
export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  let body: { sepa_batch_ref?: unknown; payout_ids?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const sepaBatchRef = typeof body.sepa_batch_ref === "string" && body.sepa_batch_ref.trim()
    ? body.sepa_batch_ref.trim() : null;
  const payoutIds = Array.isArray(body.payout_ids)
    ? body.payout_ids.filter((x): x is string => typeof x === "string") : [];

  if (!sepaBatchRef && payoutIds.length === 0) {
    return NextResponse.json(
      { error: "sepa_batch_ref ou payout_ids requis" },
      { status: 400 },
    );
  }

  // 1. Cible les lignes a marquer.
  let query = admin
    .from("tester_payouts")
    .select(`
      id, tester_id, project_id, final_amount_cents, status, exported_at, sepa_batch_ref,
      tester:testers(first_name, last_name, email),
      project:projects(title, company_name)
    `);

  if (sepaBatchRef) query = query.eq("sepa_batch_ref", sepaBatchRef);
  else query = query.in("id", payoutIds);

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne trouvee" }, { status: 404 });
  }

  const eligible = rows.filter(
    (r) => (r.status === "pending" || r.status === "approved") && r.exported_at !== null,
  );
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne eligible (deja payee, ou pas encore exportee)" },
      { status: 409 },
    );
  }

  // 2. Update atomique : status -> paid + paid_at.
  const paidAt = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("tester_payouts")
    .update({ status: "paid", paid_at: paidAt })
    .in("id", eligible.map((r) => r.id))
    .in("status", ["pending", "approved"]); // re-check anti-race

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 2bis. Credit `total_earned` (idempotent par payout_id via le ledger).
  // Sans ca, un testeur paye par SEPA afficherait "Payé" mais "Total perçu 0 €".
  // Le meme ledger sert au rail Stripe → aucun double credit possible.
  for (const r of eligible) {
    const cents = (r.final_amount_cents as number) ?? 0;
    if (cents <= 0) continue;
    const amountEuros = cents / 100;
    const { error: creditErr } = await admin.rpc("credit_tester_earnings", {
      p_payout_id: r.id,
      p_tester_id: r.tester_id,
      p_amount_euros: amountEuros,
    });
    if (creditErr) {
      console.warn("[payouts/mark-paid] credit_tester_earnings RPC indispo, fallback:", creditErr.message);
      const { data: t } = await admin
        .from("testers")
        .select("total_earned")
        .eq("id", r.tester_id)
        .maybeSingle();
      const prev = Number(t?.total_earned ?? 0);
      await admin.from("testers").update({ total_earned: prev + amountEuros }).eq("id", r.tester_id);
    }
  }

  // 3. Audit log.
  const totalCents = eligible.reduce((s, r) => s + (r.final_amount_cents as number), 0);
  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "payouts.marked_paid",
      entity_type: "tester_payouts_batch",
      entity_id: sepaBatchRef ?? `manual-${Date.now()}`,
      metadata: {
        sepa_batch_ref: sepaBatchRef,
        payout_ids: eligible.map((r) => r.id),
        rows_count: eligible.length,
        total_amount_cents: totalCents,
        paid_at: paidAt,
      },
    },
    request,
  );

  // 4. Email de confirmation par testeur (non-bloquant).
  after(async () => {
    const appUrl = tryGetAppUrl();
    const gainsUrl = appUrl ? `${appUrl}/app/dashboard/gains` : null;

    for (const r of eligible) {
      const tester = Array.isArray(r.tester) ? r.tester[0] : r.tester;
      const project = Array.isArray(r.project) ? r.project[0] : r.project;
      if (!tester?.email) continue;

      try {
        await sendEmail({
          to: tester.email,
          toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
          subject: `Votre paiement earlypanel a été émis · ${(r.final_amount_cents as number / 100).toFixed(2)} €`,
          html: buildPaymentConfirmedEmail({
            firstName: tester.first_name ?? "",
            amountEur: (r.final_amount_cents as number) / 100,
            projectTitle: project?.title ?? "",
            companyName: project?.company_name ?? "",
            gainsUrl,
          }),
        });
      } catch (e) {
        console.error("[payouts/mark-paid] email failed for", tester.email, e);
      }
    }
  });

  return NextResponse.json({
    success: true,
    rows_count: eligible.length,
    total_amount_cents: totalCents,
    paid_at: paidAt,
  });
}

function buildPaymentConfirmedEmail(opts: {
  firstName: string;
  amountEur: number;
  projectTitle: string;
  companyName: string;
  gainsUrl: string | null;
}): string {
  const greeting = opts.firstName ? `Bonjour ${opts.firstName},` : "Bonjour,";
  const company = opts.companyName ? ` (${opts.companyName})` : "";
  const link = opts.gainsUrl
    ? `<p><a href="${opts.gainsUrl}" style="display:inline-block;padding:10px 20px;background:#0A7A5A;color:#fff;text-decoration:none;border-radius:980px;font-weight:600">Voir mes gains</a></p>`
    : "";

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1d1d1f;line-height:1.6">
  <p>${greeting}</p>
  <p>Bonne nouvelle : votre paiement de <strong>${opts.amountEur.toFixed(2)} €</strong> pour la mission <strong>${opts.projectTitle}</strong>${company} vient d'être émis par virement SEPA.</p>
  <p>Selon votre banque, les fonds seront crédités sur votre compte sous <strong>1 à 2 jours ouvrés</strong>.</p>
  ${link}
  <p style="font-size:12px;color:#86868B;margin-top:32px">earlypanel — Tests utilisateurs B2B<br/>Ce paiement est tracé dans votre espace « Mes gains ».</p>
</div>
`;
}
