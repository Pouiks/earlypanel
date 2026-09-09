import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectSummary } from "@/types/staff";

/**
 * GET /api/staff/projects/[id]/summary
 *
 * Compteurs du sommaire projet (colonne de gauche de la fiche) et matiere
 * du bandeau « prochaine etape ». Une seule requete cote client au lieu de
 * charger testeurs + scenarios + rapport + versements pour afficher des
 * chiffres. Lecture seule, rien n'est calcule ici qui ne soit deja en base.
 */

const STALE_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;

  const [pts, ucs, qs, nda, report, payouts, docs] = await Promise.all([
    admin.from("project_testers").select("status, staff_rating, nda_sent_at").eq("project_id", id),
    admin.from("project_use_cases").select("id", { count: "exact", head: true }).eq("project_id", id),
    admin.from("project_questions").select("id", { count: "exact", head: true }).eq("project_id", id),
    admin.from("project_ndas").select("id").eq("project_id", id).maybeSingle(),
    admin.from("project_reports").select("status").eq("project_id", id).maybeSingle(),
    admin.from("tester_payouts").select("status").eq("project_id", id),
    admin.from("project_documents").select("id", { count: "exact", head: true }).eq("project_id", id),
  ]);

  const firstError = pts.error ?? ucs.error ?? qs.error ?? nda.error ?? report.error ?? payouts.error ?? docs.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const now = Date.now();
  const t: ProjectSummary["testers"] = {
    total: 0, selected: 0, nda_sent: 0, nda_sent_stale: 0, nda_signed: 0, in_progress: 0, completed: 0, rated: 0,
  };
  for (const row of pts.data ?? []) {
    t.total++;
    const s = row.status as string;
    if (s === "selected") t.selected++;
    else if (s === "nda_sent") {
      t.nda_sent++;
      const sentAt = row.nda_sent_at ? new Date(row.nda_sent_at as string).getTime() : NaN;
      if (Number.isFinite(sentAt) && now - sentAt > STALE_MS) t.nda_sent_stale++;
    } else if (s === "nda_signed" || s === "invited") t.nda_signed++;
    else if (s === "in_progress") t.in_progress++;
    else if (s === "completed") {
      t.completed++;
      if (row.staff_rating != null) t.rated++;
    }
  }

  const p: ProjectSummary["payouts"] = { total: 0, paid: 0, pending: 0, failed: 0 };
  for (const row of payouts.data ?? []) {
    p.total++;
    const s = row.status as string;
    if (s === "paid") p.paid++;
    else if (s === "failed") p.failed++;
    else p.pending++;
  }

  const reportStatus = (report.data?.status as string | undefined) ?? null;

  const body: ProjectSummary = {
    testers: t,
    use_cases: ucs.count ?? 0,
    questions: qs.count ?? 0,
    documents: docs.count ?? 0,
    nda_exists: !!nda.data,
    report: reportStatus === "published" ? "published" : reportStatus === "draft" ? "draft" : null,
    payouts: p,
  };

  return NextResponse.json(body);
}
