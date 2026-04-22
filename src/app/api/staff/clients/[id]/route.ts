import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;

  const { data: client, error } = await admin
    .from("b2b_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const { data: projects } = await admin
    .from("projects")
    .select("id, title, status, created_at, start_date, end_date")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ...client, projects: projects ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();

  const allowed: Record<string, unknown> = {};
  for (const k of [
    "company_name",
    "sector",
    "website",
    "company_size",
    "vat_number",
    "billing_address",
    "contact_first_name",
    "contact_last_name",
    "contact_email",
    "contact_phone",
    "contact_role",
    "notes",
    "status",
  ]) {
    if (k in body) allowed[k] = body[k];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Aucun champ a modifier" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("b2b_clients")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;

  // FK ON DELETE SET NULL sur projects.client_id -> suppression safe
  const { error } = await admin.from("b2b_clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
