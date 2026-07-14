import { NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeAllPersonas } from "@/lib/persona-matcher";

export async function POST() {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  // Recompute COMPLET (pas seulement les personas vides) : le bouton staff
  // « Recalculer tous les testeurs » doit re-classer tout le monde selon les
  // regles courantes ET backfiller job_family/seniority.
  const result = await recomputeAllPersonas(admin, { onlyEmpty: false });
  return NextResponse.json(result);
}
