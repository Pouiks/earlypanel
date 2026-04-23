import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .from("use_case_completions")
    .select("*, project_testers!inner(project_id)")
    .eq("project_testers.project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PUT(
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

  const { id: projectId } = await params;
  const body = await request.json();
  const completions: Array<{
    project_tester_id: string;
    use_case_id: string;
    criterion_id: string;
    passed: boolean;
  }> = body.completions;

  if (!Array.isArray(completions)) {
    return NextResponse.json({ error: "completions requis" }, { status: 400 });
  }

  const { data: projectTesters } = await admin
    .from("project_testers")
    .select("id")
    .eq("project_id", projectId);

  const validPtIds = new Set((projectTesters ?? []).map((pt: { id: string }) => pt.id));

  const filtered = completions.filter((c) => validPtIds.has(c.project_tester_id));

  for (const c of filtered) {
    await admin
      .from("use_case_completions")
      .upsert(
        {
          project_tester_id: c.project_tester_id,
          use_case_id: c.use_case_id,
          criterion_id: c.criterion_id,
          passed: c.passed,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "project_tester_id,criterion_id" }
      );
  }

  return NextResponse.json({ success: true, count: filtered.length });
}
