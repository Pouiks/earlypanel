import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SCORE_DELTA_MISSION_DEADLINE_EXCEEDED,
  SCORE_DELTA_NDA_UNSIGNED_AT_CLOSURE,
} from "@/lib/scoring-constants";

type AdminClient = SupabaseClient;

interface ProjectRow {
  end_date: string | null;
}

interface PtRow {
  id: string;
  status: string;
  malus_applied: boolean | null;
  malus_nda_unsigned_applied?: boolean | null;
}

/**
 * Applique les malus de cloture de campagne de facon idempotente (appel safe a chaque GET detail).
 */
export async function applyMissionClosureMalus(
  admin: AdminClient,
  project: ProjectRow,
  pt: PtRow,
  testerId: string,
  projectId: string
): Promise<{ malus_applied: boolean; malus_nda_unsigned_applied: boolean }> {
  let malusApplied = pt.malus_applied ?? false;
  let ndaUnsignedApplied = pt.malus_nda_unsigned_applied ?? false;

  if (!project.end_date) {
    return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
  }

  const end = new Date(project.end_date);
  if (end >= new Date()) {
    return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
  }

  const st = pt.status;

  if ((st === "selected" || st === "nda_sent") && !ndaUnsignedApplied) {
    await admin.rpc("apply_score_change", {
      p_tester_id: testerId,
      p_delta: SCORE_DELTA_NDA_UNSIGNED_AT_CLOSURE,
      p_reason: "NDA non signe avant cloture de campagne",
      p_project_id: projectId,
    });
    await admin
      .from("project_testers")
      .update({ malus_nda_unsigned_applied: true })
      .eq("id", pt.id);
    ndaUnsignedApplied = true;
    return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
  }

  if (["nda_signed", "invited", "in_progress"].includes(st) && !malusApplied) {
    await admin.rpc("apply_score_change", {
      p_tester_id: testerId,
      p_delta: SCORE_DELTA_MISSION_DEADLINE_EXCEEDED,
      p_reason: "Delai depasse sans soumission",
      p_project_id: projectId,
    });
    await admin.from("project_testers").update({ malus_applied: true }).eq("id", pt.id);
    malusApplied = true;
  }

  return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
}
