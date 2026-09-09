import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ageFromBirthDate } from "@/lib/taxonomy";
import { activityFilterToOr } from "@/lib/tester-activity";

// Edge Runtime : route appelee a chaque ouverture de l'onglet Testeurs et
// pour le pre-filtrage du catalogue projet. Cold start Node = ~1-2s, Edge = ~50ms.
export const runtime = "edge";
// Edge tourne pres du visiteur par defaut (Paris) : 3 allers-retours vers
// Supabase Stockholm en serie. On epingle l'execution a cote de la base.
export const preferredRegion = "arn1";

const SELECT_COLUMNS =
  "id, email, first_name, last_name, phone, gender, city, postal_code, job_title, sector, company_size, digital_level, csp, birth_date, tools, browsers, devices, phone_model, mobile_os, connection, availability, interests, ux_experience, status, profile_completed, created_at, tier, quality_score, missions_completed, total_earned, available_until, availability_responded_at, availability_check_sent_at, last_login_at, last_seen_at, persona_id, persona_locked, persona:tester_personas(id, slug, name)";

/**
 * GET /api/staff/testers
 *
 * Filtres multi : ?key=v1&key=v2 ou ?key=v1,v2.
 *
 * Semantique STRICTE par defaut : un filtre sur csp / gender / mobile_os ne
 * renvoie que les testeurs qui ont la valeur. `include_unknown=1` ajoute les
 * profils ou le champ est NULL (ancien comportement implicite, qui faisait
 * dire « 20 femmes cadres » pour « 20 femmes cadres ou inconnues »).
 *
 * `location` accepte plusieurs valeurs (OR) : ville ou prefixe de code postal.
 * `count=1` : renvoie { total } sans les lignes (compteur live des filtres).
 *
 * `activity` : inactive_30 | inactive_90 | inactive_180 | inactive_365 | rgpd | never
 * (derniere requete authentifiee, cf. src/lib/tester-activity.ts, migration 043).
 */
export async function GET(request: NextRequest) {
  // Server-Timing : visible dans DevTools > Timing > Server Timing. Sert a
  // attribuer la latence (auth / base / total) sans deviner.
  const t0 = Date.now();
  const staff = await getStaffMember();
  const tAuth = Date.now() - t0;
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const multi = (k: string) =>
    searchParams.getAll(k).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);

  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const includeUnknown = ["1", "true"].includes(searchParams.get("include_unknown") ?? "");
  const countOnly = ["1", "true"].includes(searchParams.get("count") ?? "");
  const activityOr = activityFilterToOr(searchParams.get("activity") ?? "");
  const locationList = multi("location");
  const sectorList = multi("sector");
  const cspList = multi("csp");
  const genderList = multi("gender"); // female | male | non_binary | prefer_not_to_say
  const digitalLevelList = multi("digital_level");
  const connectionList = multi("connection");
  const devicesList = multi("devices");
  const browsersList = multi("browsers");
  const mobileOsList = multi("mobile_os");
  const companySizeList = multi("company_size");
  const tierList = multi("tier");
  const personaList = multi("persona_id");
  const jobTitle = searchParams.get("job_title")?.trim();
  const ageMinRaw = searchParams.get("age_min");
  const ageMaxRaw = searchParams.get("age_max");
  const ageMin = ageMinRaw && Number.isFinite(Number(ageMinRaw)) ? Number(ageMinRaw) : null;
  const ageMax = ageMaxRaw && Number.isFinite(Number(ageMaxRaw)) ? Number(ageMaxRaw) : null;

  // G11 : pagination defensive, bornee a 5000 lignes.
  const limitRaw = Number(searchParams.get("limit"));
  const offsetRaw = Number(searchParams.get("offset"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 1000;
  const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  // Helper : quote pour PostgREST or() (double quotes doublees a l'interieur).
  const quoteList = (arr: string[]) => arr.map((v) => `"${v.replace(/"/g, '""')}"`).join(",");
  // Enum nullable : strict par defaut, tolerant si include_unknown.
  const inOrNull = (col: string, arr: string[]) =>
    includeUnknown ? `${col}.in.(${quoteList(arr)}),${col}.is.null` : null;

  // Les memes filtres s'appliquent a la requete de comptage et a la requete
  // de donnees : une seule fonction pour ne jamais les faire diverger.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters<Q extends Record<string, any>>(q: Q): Q {
    if (status && status !== "all") {
      q = q.eq("status", status);
      // Defense en profondeur : « actif » implique profil complet.
      if (status === "active") q = q.eq("profile_completed", true);
    } else {
      q = q.in("status", ["active", "pending"]);
    }
    if (searchParams.get("available") === "confirmed") {
      q = q.gte("available_until", new Date().toISOString());
    }
    if (activityOr) q = q.or(activityOr);
    if (digitalLevelList.length > 0) q = q.in("digital_level", digitalLevelList);
    if (sectorList.length > 0) q = q.in("sector", sectorList);
    if (cspList.length > 0) { const o = inOrNull("csp", cspList); q = o ? q.or(o) : q.in("csp", cspList); }
    if (genderList.length > 0) { const o = inOrNull("gender", genderList); q = o ? q.or(o) : q.in("gender", genderList); }
    if (mobileOsList.length > 0) { const o = inOrNull("mobile_os", mobileOsList); q = o ? q.or(o) : q.in("mobile_os", mobileOsList); }
    if (connectionList.length > 0) q = q.in("connection", connectionList);
    if (companySizeList.length > 0) q = q.in("company_size", companySizeList);
    if (tierList.length > 0) q = q.in("tier", tierList);
    if (personaList.length > 0) q = q.in("persona_id", personaList);
    // Arrays DB : overlaps = au moins un element en commun.
    if (devicesList.length > 0) q = q.overlaps("devices", devicesList);
    if (browsersList.length > 0) q = q.overlaps("browsers", browsersList);
    // Localisation : OR entre toutes les villes/CP demandes. « 75 » matche
    // 75XXX, « Lyon » matche Lyon et arrondissements.
    if (locationList.length > 0) {
      const clauses = locationList.map((loc) => {
        const safe = loc.replace(/[%_,()]/g, "");
        return `city.ilike.%${safe}%,postal_code.ilike.${safe}%`;
      });
      q = q.or(clauses.join(","));
    }
    // Age -> bornes birth_date.
    if (ageMin !== null || ageMax !== null) {
      const today = new Date();
      if (ageMax !== null) {
        const minBirth = new Date(today);
        minBirth.setUTCFullYear(today.getUTCFullYear() - ageMax - 1);
        minBirth.setUTCDate(minBirth.getUTCDate() + 1);
        q = q.gte("birth_date", minBirth.toISOString().slice(0, 10));
      }
      if (ageMin !== null) {
        const maxBirth = new Date(today);
        maxBirth.setUTCFullYear(today.getUTCFullYear() - ageMin);
        q = q.lte("birth_date", maxBirth.toISOString().slice(0, 10));
      }
    }
    // Metier : ILIKE sur l'index trigram (migration 030).
    if (jobTitle) q = q.ilike("job_title", `%${jobTitle.replace(/[%_,()]/g, "")}%`);
    if (search) {
      const safe = search.replace(/[%_,()]/g, "");
      q = q.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }
    return q;
  }

  if (countOnly) {
    const { count, error } = await applyFilters(
      admin.from("testers").select("id", { count: "exact", head: true }),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ total: count ?? 0 });
  }

  // Les deux lectures sont independantes : en parallele plutot qu'en serie
  // (tester_payment_info ne contient que des ids, table petite).
  const tDb0 = Date.now();
  const [{ data, error }, { data: paymentRows }] = await Promise.all([
    applyFilters(
      admin.from("testers").select(SELECT_COLUMNS).order("created_at", { ascending: false }).range(offset, offset + limit - 1),
    ),
    admin.from("tester_payment_info").select("tester_id"),
  ]);

  const tDb = Date.now() - tDb0;
  const serverTiming = () => ({
    "Server-Timing": `auth;dur=${tAuth}, db;dur=${tDb}, total;dur=${Date.now() - t0}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  // Annotation "payment_info_configured" : existence d'une ligne
  // tester_payment_info (IBAN + CGU paiement), sans ramener les donnees.
  if (rows.length > 0) {
    const configuredSet = new Set((paymentRows ?? []).map((p) => p.tester_id));
    const annotated = rows.map((r) => {
      const row = r as { id: string; birth_date: string | null };
      return {
        ...r,
        payment_info_configured: configuredSet.has(row.id),
        age: ageFromBirthDate(row.birth_date),
      };
    });
    return NextResponse.json(annotated, { headers: serverTiming() });
  }

  return NextResponse.json(rows, { headers: serverTiming() });
}
