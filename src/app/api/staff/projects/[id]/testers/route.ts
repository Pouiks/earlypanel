import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsStaffAssignTesters, projectIsClosedForCampaign } from "@/lib/project-lifecycle";
import { REQUIRED_FIELDS, isTesterEligibleForInvitation } from "@/lib/profile-completeness";
import { logStaffAction } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;

  const { data, error } = await admin
    .from("project_testers")
    .select("*, tester:testers(id, email, first_name, last_name, phone, job_title, sector, devices, digital_level, browsers, connection, status, profile_completed)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;
  const { tester_ids } = await request.json();

  if (!Array.isArray(tester_ids) || tester_ids.length === 0) {
    return NextResponse.json({ error: "tester_ids requis" }, { status: 400 });
  }

  const { data: proj } = await admin
    .from("projects")
    .select("status")
    .eq("id", id)
    .single();

  if (!proj) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (projectIsClosedForCampaign(proj.status as string)) {
    return NextResponse.json(
      { error: "Projet clos : impossible d'assigner des testeurs" },
      { status: 400 }
    );
  }
  if (!projectAllowsStaffAssignTesters(proj.status as string)) {
    return NextResponse.json({ error: "Statut projet incompatible" }, { status: 400 });
  }

  // Garde-fou : on n'assigne que des testeurs actifs avec un profil COMPLET.
  // Defense en profondeur : on ne se repose pas uniquement sur `status` et
  // `profile_completed` mais on recalcule via computeProfileCompleteness sur
  // tous les champs requis (cf. PROJECT_CONTEXT 13.1, lib/profile-completeness).
  const SELECT_FIELDS = [
    "id",
    "status",
    "profile_completed",
    ...REQUIRED_FIELDS.map((f) => f.key),
  ].join(", ");

  const { data: candidates } = await admin
    .from("testers")
    .select(SELECT_FIELDS)
    .in("id", tester_ids);

  type Candidate = { id: string; [key: string]: unknown };
  const eligible: Candidate[] = ((candidates as unknown as Candidate[]) ?? []).filter(
    (t) => isTesterEligibleForInvitation(t)
  );
  const eligibleIds = eligible.map((t) => t.id);
  const rejectedIds = tester_ids.filter((id: string) => !eligibleIds.includes(id));

  if (eligibleIds.length === 0) {
    return NextResponse.json(
      {
        error:
          "Aucun testeur eligible : seuls les testeurs actifs avec un profil complet (incluant adresse, ville, code postal, date de naissance) peuvent etre assignes.",
        rejected_tester_ids: rejectedIds,
      },
      { status: 400 }
    );
  }

  const rows = eligibleIds.map((tester_id: string) => ({
    project_id: id,
    tester_id,
    status: "selected",
  }));

  const { data, error } = await admin
    .from("project_testers")
    .upsert(rows, { onConflict: "project_id,tester_id", ignoreDuplicates: true })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && data.length > 0) {
    await logStaffAction(
      {
        staff_id: staff.id,
        staff_email: staff.email,
        action: "project_tester.assigned",
        entity_type: "project",
        entity_id: id,
        metadata: {
          assigned_tester_ids: data.map((r) => r.tester_id),
          rejected_tester_ids: rejectedIds,
          assigned_count: data.length,
        },
      },
      request,
    );
  }

  return NextResponse.json(
    {
      assigned: data ?? [],
      rejected_tester_ids: rejectedIds,
    },
    { status: 201 }
  );
}
