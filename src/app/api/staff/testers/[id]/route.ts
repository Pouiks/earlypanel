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
    .from("testers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Testeur introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();

  const allowed: Record<string, unknown> = {};
  if ("persona_id" in body) allowed.persona_id = body.persona_id;
  if ("persona_locked" in body) allowed.persona_locked = !!body.persona_locked;
  if ("gender" in body) allowed.gender = body.gender || null;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("testers")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
