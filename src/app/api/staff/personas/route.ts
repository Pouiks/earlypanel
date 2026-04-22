import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { data, error } = await admin
    .from("tester_personas")
    .select("*")
    .order("priority", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: counts } = await admin
    .from("testers")
    .select("persona_id");

  const countByPersona = new Map<string, number>();
  (counts ?? []).forEach((r) => {
    if (r.persona_id) countByPersona.set(r.persona_id, (countByPersona.get(r.persona_id) ?? 0) + 1);
  });

  const enriched = (data ?? []).map((p) => ({ ...p, tester_count: countByPersona.get(p.id) ?? 0 }));
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const body = await request.json();
  const {
    slug,
    name,
    description,
    min_reward_cents,
    max_reward_cents,
    matching_rules,
    priority,
    is_active,
    is_fallback,
  } = body ?? {};

  if (!slug || !name) {
    return NextResponse.json({ error: "slug et name obligatoires" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("tester_personas")
    .insert({
      slug,
      name,
      description: description ?? null,
      min_reward_cents: Number(min_reward_cents ?? 0),
      max_reward_cents: Number(max_reward_cents ?? 0),
      matching_rules: matching_rules ?? {},
      priority: Number(priority ?? 0),
      is_active: is_active ?? true,
      is_fallback: is_fallback ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
