import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";

/**
 * POST /api/staff/payouts/export
 *
 * Body : { payout_ids: string[] }
 *
 * Workflow :
 *   1. Verifie que toutes les lignes sont status pending|approved et exported_at IS NULL
 *   2. Recupere tester + payment_info (last4, holder name) + projet
 *   3. Dechiffre les IBAN par lot via la RPC decrypt_tester_ibans_batch
 *   4. Genere un sepa_batch_ref unique (BATCH-YYYY-WXX-NNN)
 *   5. Marque les lignes : exported_at = now(), sepa_batch_ref = batch_ref
 *   6. Audit log avec la liste des tester_id et le batch_ref (preuve d'acces IBAN)
 *   7. Retourne le CSV en download (text/csv) — le browser sauve le fichier
 */
export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const encryptionKey = process.env.IBAN_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    console.error("[payouts/export] IBAN_ENCRYPTION_KEY missing or too short");
    return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
  }

  let body: { payout_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const ids = Array.isArray(body.payout_ids) ? body.payout_ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucune ligne selectionnee" }, { status: 400 });
  }

  // 1. Fetch payouts avec testeur + projet, on filtre les inclure-ables.
  const { data: payouts, error: fetchErr } = await admin
    .from("tester_payouts")
    .select(`
      id, status, exported_at, final_amount_cents, tester_id, project_id,
      tester:testers(first_name, last_name, email),
      project:projects(title, ref_number, company_name)
    `)
    .in("id", ids);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!payouts || payouts.length !== ids.length) {
    return NextResponse.json({ error: "Certaines lignes sont introuvables" }, { status: 404 });
  }

  const eligible = payouts.filter(
    (p) => (p.status === "pending" || p.status === "approved") && p.exported_at === null,
  );
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne eligible (deja exportee ou statut non payable)" },
      { status: 409 },
    );
  }

  // 2. Recupere les payment_info (holder name, last4, BIC).
  const testerIds = eligible.map((p) => p.tester_id as string);
  const { data: paymentInfos } = await admin
    .from("tester_payment_info")
    .select("tester_id, iban_last4, bic, account_holder_name")
    .in("tester_id", testerIds);

  const piByTester = new Map<string, { iban_last4: string; bic: string | null; holder: string }>();
  (paymentInfos ?? []).forEach((row) => {
    piByTester.set(row.tester_id as string, {
      iban_last4: row.iban_last4 as string,
      bic: (row.bic as string | null) ?? null,
      holder: row.account_holder_name as string,
    });
  });

  // Filtre uniquement ceux qui ont un IBAN configure.
  const finalEligible = eligible.filter((p) => piByTester.has(p.tester_id as string));
  if (finalEligible.length === 0) {
    return NextResponse.json(
      { error: "Aucun testeur du lot n'a configure son IBAN" },
      { status: 409 },
    );
  }

  // 3. Dechiffrement par lot via RPC.
  const { data: decryptedRows, error: rpcErr } = await admin.rpc(
    "decrypt_tester_ibans_batch",
    {
      p_tester_ids: finalEligible.map((p) => p.tester_id),
      p_encryption_key: encryptionKey,
    },
  );

  if (rpcErr) {
    console.error("[payouts/export] decrypt RPC failed", rpcErr.message);
    return NextResponse.json({ error: "Dechiffrement echoue" }, { status: 500 });
  }

  const ibanByTester = new Map<string, string>();
  (decryptedRows as Array<{ tester_id: string; iban_clear: string }> | null)?.forEach((row) => {
    ibanByTester.set(row.tester_id, row.iban_clear);
  });

  // 4. Genere une reference de batch unique.
  const now = new Date();
  const yearWeek = getIsoYearWeek(now);
  const batchRef = `BATCH-${yearWeek}-${String(Date.now()).slice(-5)}`;
  const exportedAt = now.toISOString();

  // 5. Marque les lignes.
  const finalIds = finalEligible.map((p) => p.id as string);
  const { error: updateErr } = await admin
    .from("tester_payouts")
    .update({ exported_at: exportedAt, sepa_batch_ref: batchRef })
    .in("id", finalIds);

  if (updateErr) {
    console.error("[payouts/export] update tracking failed", updateErr.message);
    return NextResponse.json({ error: "Echec marquage tracabilite" }, { status: 500 });
  }

  // 6. Audit log immuable (preuve d'acces aux IBAN).
  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "payouts.csv_exported",
      entity_type: "tester_payouts_batch",
      entity_id: batchRef,
      metadata: {
        sepa_batch_ref: batchRef,
        payout_ids: finalIds,
        tester_ids: finalEligible.map((p) => p.tester_id),
        total_amount_cents: finalEligible.reduce((s, p) => s + (p.final_amount_cents as number), 0),
        rows_count: finalEligible.length,
      },
    },
    request,
  );

  // 7. Genere le CSV.
  const csv = buildCsv(finalEligible, piByTester, ibanByTester, batchRef);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${batchRef}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

interface EligibleRow {
  id: string;
  tester_id: string;
  project_id: string;
  final_amount_cents: number;
  tester: { first_name: string | null; last_name: string | null; email: string } | { first_name: string | null; last_name: string | null; email: string }[] | null;
  project: { title: string; ref_number: string | null; company_name: string | null } | { title: string; ref_number: string | null; company_name: string | null }[] | null;
}

function buildCsv(
  rows: unknown[],
  paymentInfoByTester: Map<string, { iban_last4: string; bic: string | null; holder: string }>,
  ibanByTester: Map<string, string>,
  batchRef: string,
): string {
  // En-tete : format pratique pour import Qonto / banque.
  const headers = [
    "Beneficiaire",
    "IBAN",
    "BIC",
    "Montant_EUR",
    "Libelle",
    "Reference_batch",
    "Email",
    "Projet",
    "Tester_ID",
    "Project_ID",
    "Payout_ID",
  ];

  const lines = [headers.join(";")];

  for (const r of rows) {
    const row = r as EligibleRow;
    const tester = Array.isArray(row.tester) ? row.tester[0] : row.tester;
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    const pi = paymentInfoByTester.get(row.tester_id)!;
    const ibanClear = ibanByTester.get(row.tester_id) ?? "";
    const fullName = `${tester?.first_name ?? ""} ${tester?.last_name ?? ""}`.trim() || pi.holder;
    const refProj = project?.ref_number ?? project?.title?.slice(0, 30) ?? "EAR-MISSION";
    const libelle = `EAR ${refProj}`.slice(0, 35); // SEPA libelle limite

    const cells = [
      csvEscape(fullName),
      csvEscape(ibanClear),
      csvEscape(pi.bic ?? ""),
      formatAmount(row.final_amount_cents),
      csvEscape(libelle),
      csvEscape(batchRef),
      csvEscape(tester?.email ?? ""),
      csvEscape(project?.title ?? ""),
      csvEscape(row.tester_id),
      csvEscape(row.project_id),
      csvEscape(row.id),
    ];

    lines.push(cells.join(";"));
  }

  // BOM UTF-8 pour bonne ouverture dans Excel FR.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAmount(cents: number): string {
  // Format FR : virgule decimale, pas de separateur de milliers (Qonto-friendly).
  const euros = cents / 100;
  return euros.toFixed(2).replace(".", ",");
}

function getIsoYearWeek(d: Date): string {
  // ISO 8601 : semaine ISO + annee correspondante (peut differer de getFullYear()).
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
