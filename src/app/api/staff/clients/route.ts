import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = admin.from("b2b_clients").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compte projets par client
  const { data: projectCounts } = await admin
    .from("projects")
    .select("client_id");

  const countByClient = new Map<string, number>();
  (projectCounts ?? []).forEach((r) => {
    if (r.client_id) countByClient.set(r.client_id, (countByClient.get(r.client_id) ?? 0) + 1);
  });

  const enriched = (data ?? []).map((c) => ({ ...c, project_count: countByClient.get(c.id) ?? 0 }));
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const body = await request.json();
  if (!body?.company_name?.trim()) {
    return NextResponse.json({ error: "Le nom de l'entreprise est obligatoire" }, { status: 400 });
  }

  const payload = {
    company_name: body.company_name.trim(),
    sector: body.sector ?? null,
    website: body.website ?? null,
    company_size: body.company_size ?? null,
    vat_number: body.vat_number ?? null,
    billing_address: body.billing_address ?? null,
    contact_first_name: body.contact_first_name ?? null,
    contact_last_name: body.contact_last_name ?? null,
    contact_email: body.contact_email ?? null,
    contact_phone: body.contact_phone ?? null,
    contact_role: body.contact_role ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "active",
    created_by: staff.id,
  };

  const { data, error } = await admin.from("b2b_clients").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
