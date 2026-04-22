import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();

  const allowed: Record<string, unknown> = {};
  for (const k of [
    "name",
    "description",
    "min_reward_cents",
    "max_reward_cents",
    "matching_rules",
    "priority",
    "is_active",
    "is_fallback",
  ]) {
    if (k in body) allowed[k] = body[k];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Aucun champ a modifier" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("tester_personas")
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

  const { data: p } = await admin.from("tester_personas").select("is_fallback").eq("id", id).maybeSingle();
  if (p?.is_fallback) {
    return NextResponse.json({ error: "Le persona fallback ne peut pas etre supprime" }, { status: 400 });
  }

  const { error } = await admin.from("tester_personas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
