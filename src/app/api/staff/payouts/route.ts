import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/staff/payouts
 *
 * Liste des paiements testeurs cross-projet, avec auto-creation lazy :
 * a chaque appel, les project_testers en status='completed' qui n'ont pas
 * encore de ligne tester_payouts en obtiennent une (montant = persona.
 * payout_per_mission_cents). Garantit qu'aucune mission validee n'est
 * oubliee.
 *
 * Query params (tous optionnels) :
 *   - status: 'pending' | 'approved' | 'paid' | 'failed' | 'all' (defaut: 'pending')
 *   - project_id: UUID — filtre par projet
 *   - sepa_batch_ref: string — filtre par lot d'export
 *   - with_iban: 'true' | 'false' — filtre par disponibilite IBAN
 *   - exported: 'yes' | 'no' | 'all' (defaut: 'all') — filtre exported_at
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  // 1. Auto-creation lazy : trouver les project_testers completed sans payout.
  const { data: orphans } = await admin
    .from("project_testers")
    .select("id, project_id, tester_id, completed_at, tester:testers(persona_id)")
    .eq("status", "completed")
    .not("completed_at", "is", null);

  if (orphans && orphans.length > 0) {
    const ptIds = orphans.map((o) => o.id);
    const { data: existingPayouts } = await admin
      .from("tester_payouts")
      .select("project_tester_id")
      .in("project_tester_id", ptIds);

    const existingSet = new Set((existingPayouts ?? []).map((p) => p.project_tester_id));
    const toCreate = orphans.filter((o) => !existingSet.has(o.id));

    if (toCreate.length > 0) {
      // Recupere les montants par persona en un seul fetch
      const personaIds = Array.from(
        new Set(
          toCreate
            .map((o) => {
              const tester = o.tester as unknown as { persona_id: string | null } | null;
              return tester?.persona_id;
            })
            .filter((x): x is string => !!x),
        ),
      );

      const personaAmount = new Map<string, number>();
      if (personaIds.length > 0) {
        const { data: personas } = await admin
          .from("tester_personas")
          .select("id, payout_per_mission_cents")
          .in("id", personaIds);
        (personas ?? []).forEach((p) => personaAmount.set(p.id as string, p.payout_per_mission_cents as number));
      }

      const rows = toCreate.map((o) => {
        const tester = o.tester as unknown as { persona_id: string | null } | null;
        const personaId = tester?.persona_id ?? null;
        const amount = personaId ? personaAmount.get(personaId) ?? 0 : 0;
        return {
          project_id: o.project_id,
          tester_id: o.tester_id,
          project_tester_id: o.id,
          calculated_amount_cents: amount,
          final_amount_cents: amount,
          status: "pending" as const,
        };
      });

      // L'unique constraint sur project_tester_id evite les doublons en cas de race.
      await admin.from("tester_payouts").upsert(rows, { onConflict: "project_tester_id", ignoreDuplicates: true });
    }
  }

  // 2. Construit la query principale avec filtres.
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";
  const projectId = url.searchParams.get("project_id");
  const sepaBatchRef = url.searchParams.get("sepa_batch_ref");
  const exported = url.searchParams.get("exported") ?? "all";

  let query = admin
    .from("tester_payouts")
    .select(`
      id, created_at, updated_at, project_id, tester_id, project_tester_id,
      calculated_amount_cents, final_amount_cents, status, paid_at,
      exported_at, sepa_batch_ref, last_error,
      tester:testers(id, first_name, last_name, email, persona_id),
      project:projects(id, title, ref_number, company_name)
    `)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (projectId) query = query.eq("project_id", projectId);
  if (sepaBatchRef) query = query.eq("sepa_batch_ref", sepaBatchRef);
  if (exported === "yes") query = query.not("exported_at", "is", null);
  if (exported === "no") query = query.is("exported_at", null);

  const { data: payouts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Annoter chaque ligne avec payment_info_configured (sans dechiffrer l'IBAN).
  const testerIds = Array.from(new Set((payouts ?? []).map((p) => p.tester_id as string)));
  const paymentInfoSet = new Set<string>();
  if (testerIds.length > 0) {
    const { data: pi } = await admin
      .from("tester_payment_info")
      .select("tester_id, iban_last4, account_holder_name")
      .in("tester_id", testerIds);
    (pi ?? []).forEach((row) => paymentInfoSet.add(row.tester_id as string));
  }

  const enriched = (payouts ?? []).map((p) => ({
    ...p,
    payment_info_configured: paymentInfoSet.has(p.tester_id as string),
  }));

  return NextResponse.json({ payouts: enriched });
}
