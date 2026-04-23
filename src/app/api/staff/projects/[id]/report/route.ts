import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;

  const { data, error } = await admin
    .from("project_reports")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json();

  const payload: Record<string, unknown> = {};
  const allowed = [
    "delivery_date", "summary", "bugs", "frictions",
    "recommendations", "impact_effort_matrix", "include_annexes",
  ];
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }

  const { data: existing } = await admin
    .from("project_reports")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("project_reports")
      .update(payload)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await admin
    .from("project_reports")
    .insert({ project_id: projectId, ...payload })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
