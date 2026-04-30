import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const digital_level = searchParams.get("digital_level");
  const sector = searchParams.get("sector");
  const connection = searchParams.get("connection");
  const devices = searchParams.get("devices");
  const browsers = searchParams.get("browsers");

  // G11 : pagination defensive. Defaults large pour preserver la compat UI
  // (l'UI consomme un array sans pagination), mais bornee a 5000 lignes max
  // pour empecher un DoS si le panel grossit.
  const limitRaw = Number(searchParams.get("limit"));
  const offsetRaw = Number(searchParams.get("offset"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 1000;
  const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  let query = admin
    .from("testers")
    .select("id, email, first_name, last_name, phone, job_title, sector, company_size, digital_level, tools, browsers, devices, phone_model, mobile_os, connection, availability, interests, ux_experience, status, profile_completed, created_at, tier, quality_score, missions_completed, total_earned, persona_id, persona_locked, persona:tester_personas(id, slug, name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filtrage statut. Pour `active`, on AJOUTE un filtre sur `profile_completed=true`.
  // Sans ca, un testeur dont la colonne serait mal mise a jour (edge case admin
  // direct DB ou bug futur) pourrait apparaitre dans la liste "Actifs" alors
  // qu'il n'est pas reellement eligible. Defense en profondeur.
  if (status && status !== "all") {
    query = query.eq("status", status);
    if (status === "active") {
      query = query.eq("profile_completed", true);
    }
  } else {
    query = query.in("status", ["active", "pending"]);
  }

  if (digital_level) {
    query = query.eq("digital_level", digital_level);
  }

  if (sector) {
    query = query.eq("sector", sector);
  }

  if (connection) {
    query = query.eq("connection", connection);
  }

  if (devices) {
    query = query.contains("devices", [devices]);
  }

  if (browsers) {
    query = query.contains("browsers", [browsers]);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  // Annotation legere "payment_info_configured" pour signaler dans l'UI
  // staff les testeurs qui n'ont pas encore renseigne leur IBAN + signe les
  // CGU paiement. Sans cette info ils ne peuvent pas etre payes => warning
  // a cote du nom dans la liste. On ne ramene PAS la ligne payment_info
  // (donnees sensibles) — juste l'existence.
  if (rows.length > 0) {
    const ids = rows.map((r) => (r as { id: string }).id);
    const { data: paymentRows } = await admin
      .from("tester_payment_info")
      .select("tester_id")
      .in("tester_id", ids);
    const configuredSet = new Set((paymentRows ?? []).map((p) => p.tester_id));
    const annotated = rows.map((r) => ({
      ...r,
      payment_info_configured: configuredSet.has((r as { id: string }).id),
    }));
    return NextResponse.json(annotated);
  }

  return NextResponse.json(rows);
}
