import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ageFromBirthDate } from "@/lib/taxonomy";

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
  const location = searchParams.get("location")?.trim(); // ville OU code postal (prefixe)
  // Tous les filtres multi : on accepte ?key=v1&key=v2 ou ?key=v1,v2
  const multi = (k: string) =>
    searchParams.getAll(k).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
  const sectorList = multi("sector");
  const cspList = multi("csp");
  const genderList = multi("gender"); // female | male | non_binary | prefer_not_to_say
  const digitalLevelList = multi("digital_level"); // debutant | intermediaire | avance | expert
  const connectionList = multi("connection"); // Fibre | ADSL | 4G/5G
  const devicesList = multi("devices"); // PC Windows, Mac, iPhone…
  const browsersList = multi("browsers"); // Chrome, Firefox…
  const mobileOsList = multi("mobile_os"); // iOS | Android
  const companySizeList = multi("company_size");
  const tierList = multi("tier"); // standard | expert | premium
  const personaList = multi("persona_id"); // UUID[]
  // Recherche fuzzy sur job_title (utilise l'index pg_trgm de la migration 030).
  const jobTitle = searchParams.get("job_title")?.trim();
  // Tranche d'age : on filtre sur birth_date en derivant les bornes.
  const ageMinRaw = searchParams.get("age_min");
  const ageMaxRaw = searchParams.get("age_max");
  const ageMin = ageMinRaw && Number.isFinite(Number(ageMinRaw)) ? Number(ageMinRaw) : null;
  const ageMax = ageMaxRaw && Number.isFinite(Number(ageMaxRaw)) ? Number(ageMaxRaw) : null;

  // G11 : pagination defensive. Defaults large pour preserver la compat UI
  // (l'UI consomme un array sans pagination), mais bornee a 5000 lignes max
  // pour empecher un DoS si le panel grossit.
  const limitRaw = Number(searchParams.get("limit"));
  const offsetRaw = Number(searchParams.get("offset"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 1000;
  const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  let query = admin
    .from("testers")
    .select("id, email, first_name, last_name, phone, gender, city, postal_code, job_title, sector, company_size, digital_level, csp, birth_date, tools, browsers, devices, phone_model, mobile_os, connection, availability, interests, ux_experience, status, profile_completed, created_at, tier, quality_score, missions_completed, total_earned, persona_id, persona_locked, persona:tester_personas(id, slug, name)")
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

  // Helper : quote pour PostgREST or() (double quotes doublees a l'interieur).
  const quoteList = (arr: string[]) =>
    arr.map((v) => `"${v.replace(/"/g, '""')}"`).join(",");

  if (digitalLevelList.length > 0) {
    query = query.in("digital_level", digitalLevelList);
  }

  if (sectorList.length > 0) {
    query = query.in("sector", sectorList);
  }

  if (cspList.length > 0) {
    // Tolerance NULL pour CSP : optionnelle dans l'onboarding, beaucoup de
    // testeurs inscrits avant son introduction n'en ont pas. On les inclut.
    query = query.or(`csp.in.(${quoteList(cspList)}),csp.is.null`);
  }

  if (genderList.length > 0) {
    // Tolerance NULL pour gender : champ optionnel.
    query = query.or(`gender.in.(${quoteList(genderList)}),gender.is.null`);
  }

  if (connectionList.length > 0) {
    query = query.in("connection", connectionList);
  }

  if (mobileOsList.length > 0) {
    // Tolerance NULL : un testeur sans phone n'a pas de mobile_os.
    query = query.or(`mobile_os.in.(${quoteList(mobileOsList)}),mobile_os.is.null`);
  }

  if (companySizeList.length > 0) {
    query = query.in("company_size", companySizeList);
  }

  if (tierList.length > 0) {
    query = query.in("tier", tierList);
  }

  if (personaList.length > 0) {
    query = query.in("persona_id", personaList);
  }

  // Devices et browsers sont des arrays cote DB. .overlaps fait l'intersection :
  // un testeur match s'il a AU MOINS UN device/browser de la liste demandee.
  if (devicesList.length > 0) {
    query = query.overlaps("devices", devicesList);
  }

  if (browsersList.length > 0) {
    query = query.overlaps("browsers", browsersList);
  }

  // Localisation : recherche permissive sur ville OU debut de code postal.
  // "75" matche tous les arrondissements de Paris ; "Lyon" matche "Lyon", "Lyon 1er".
  if (location) {
    const safe = location.replace(/[%_]/g, "\\$&");
    query = query.or(`city.ilike.%${safe}%,postal_code.ilike.${safe}%`);
  }

  // Filtre age : on traduit en bornes birth_date. Age max => date min (plus
  // ancien) ; age min => date max (plus recent). Ex: age 25-34 ans aujourd'hui
  // 2026-05-02 => birth_date entre 1991-05-02 (35-1) et 2001-05-02 (25).
  if (ageMin !== null || ageMax !== null) {
    const today = new Date();
    if (ageMax !== null) {
      const minBirth = new Date(today);
      minBirth.setUTCFullYear(today.getUTCFullYear() - ageMax - 1);
      // L'utilisateur pourrait avoir ageMax aujourd'hui meme : on prend +1 jour pour inclure les anniversaires d'aujourd'hui.
      minBirth.setUTCDate(minBirth.getUTCDate() + 1);
      query = query.gte("birth_date", minBirth.toISOString().slice(0, 10));
    }
    if (ageMin !== null) {
      const maxBirth = new Date(today);
      maxBirth.setUTCFullYear(today.getUTCFullYear() - ageMin);
      query = query.lte("birth_date", maxBirth.toISOString().slice(0, 10));
    }
  }

  // Recherche fuzzy job_title via l'index trigram pg_trgm. ILIKE est suffisamment
  // efficace avec gin_trgm_ops pour ce volume.
  if (jobTitle) {
    query = query.ilike("job_title", `%${jobTitle}%`);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
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
    const annotated = rows.map((r) => {
      const row = r as { id: string; birth_date: string | null };
      return {
        ...r,
        payment_info_configured: configuredSet.has(row.id),
        age: ageFromBirthDate(row.birth_date),
      };
    });
    return NextResponse.json(annotated);
  }

  return NextResponse.json(rows);
}
