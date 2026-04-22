import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET : liste des versements pour un projet.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;

  const { data, error } = await admin
    .from("tester_payouts")
    .select(`
      id,
      created_at,
      updated_at,
      project_id,
      tester_id,
      project_tester_id,
      calculated_amount_cents,
      final_amount_cents,
      status,
      stripe_transfer_id,
      paid_at,
      last_error,
      tester:testers(first_name, last_name, email, stripe_account_id)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payouts: data ?? [] });
}

/**
 * PATCH : ajuster le montant final avant paiement.
 * Body : { payout_id: string, final_amount_cents: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json();
  const payoutId = body?.payout_id as string | undefined;
  const finalCents = Number(body?.final_amount_cents);

  if (!payoutId || !Number.isFinite(finalCents) || finalCents < 0) {
    return NextResponse.json({ error: "payout_id et final_amount_cents valides requis" }, { status: 400 });
  }

  const { data: row } = await admin
    .from("tester_payouts")
    .select("id, project_id, status")
    .eq("id", payoutId)
    .maybeSingle();

  if (!row || row.project_id !== projectId) {
    return NextResponse.json({ error: "Versement introuvable" }, { status: 404 });
  }
  if (row.status === "paid") {
    return NextResponse.json({ error: "Versement déjà effectué" }, { status: 409 });
  }

  const { error } = await admin
    .from("tester_payouts")
    .update({ final_amount_cents: Math.round(finalCents), updated_at: new Date().toISOString() })
    .eq("id", payoutId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
