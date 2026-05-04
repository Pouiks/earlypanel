import { NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECTORS, CSPS, AGE_BUCKETS, ageFromBirthDate, ageBucketLabel } from "@/lib/taxonomy";

// Edge Runtime : page diversite consultee occasionnellement, mais l'agregat
// est petit. Cold start eviting compense largement.
export const runtime = "edge";

/**
 * GET /api/staff/diversity
 *
 * Retourne une vue agregee du panel testeur pour le pitch commercial :
 *   - total_active : nombre de testeurs actifs
 *   - by_sector : map secteur -> count
 *   - by_csp : map CSP -> count
 *   - by_age_bucket : map tranche -> count
 *   - matrix : grille secteur x age_bucket (count)
 *
 * Restreint aux testeurs status='active' & profile_completed=true (les seuls
 * vraiment exploitables pour un projet client).
 */
export async function GET() {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { data: testers, error } = await admin
    .from("testers")
    .select("id, sector, csp, birth_date")
    .eq("status", "active")
    .eq("profile_completed", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = testers ?? [];
  const totalActive = list.length;

  // Initialise les counters a 0 pour TOUS les secteurs/csp/buckets connus
  // (ceux non remplis affichent 0 dans la matrice — utile pour le pitch).
  const bySector: Record<string, number> = {};
  for (const s of SECTORS) bySector[s] = 0;

  const byCsp: Record<string, number> = {};
  for (const c of CSPS) byCsp[c] = 0;

  const byAgeBucket: Record<string, number> = {};
  for (const b of AGE_BUCKETS) byAgeBucket[b.label] = 0;

  // Matrice secteur x age_bucket : { [sector]: { [bucket]: count } }
  const matrix: Record<string, Record<string, number>> = {};
  for (const s of SECTORS) {
    matrix[s] = {};
    for (const b of AGE_BUCKETS) matrix[s][b.label] = 0;
  }

  for (const t of list) {
    const sector = (t.sector as string | null) ?? null;
    const csp = (t.csp as string | null) ?? null;
    const age = ageFromBirthDate(t.birth_date as string | null);
    const bucket = ageBucketLabel(age);

    if (sector && sector in bySector) bySector[sector] += 1;
    if (csp && csp in byCsp) byCsp[csp] += 1;
    if (bucket && bucket in byAgeBucket) byAgeBucket[bucket] += 1;
    if (sector && bucket && matrix[sector] && bucket in matrix[sector]) {
      matrix[sector][bucket] += 1;
    }
  }

  return NextResponse.json(
    {
      total_active: totalActive,
      by_sector: bySector,
      by_csp: byCsp,
      by_age_bucket: byAgeBucket,
      matrix,
      sectors: SECTORS,
      csps: CSPS,
      age_buckets: AGE_BUCKETS.map((b) => b.label),
    },
    {
      // Cache 30s + stale-while-revalidate 5min : agreges qui evoluent
      // tres lentement (nouveaux inscrits, profils mis a jour). Re-charger
      // a chaque ouverture de la page est inutile.
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=300" },
    },
  );
}
