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
 * G9 : claim atomique d'un malus via RPC dediee. Si la RPC n'est pas
 * deployee (ancien schema), fallback vers le flux non-atomique historique
 * (race-prone mais idempotent au sens "best-effort").
 */
async function tryClaimMalus(
  admin: AdminClient,
  ptId: string,
  testerId: string,
  projectId: string,
  kind: "nda_unsigned" | "deadline_exceeded"
): Promise<{ applied: boolean; rpcAvailable: boolean }> {
  const delta =
    kind === "nda_unsigned"
      ? SCORE_DELTA_NDA_UNSIGNED_AT_CLOSURE
      : SCORE_DELTA_MISSION_DEADLINE_EXCEEDED;
  const reason =
    kind === "nda_unsigned"
      ? "NDA non signe avant cloture de campagne"
      : "Delai depasse sans soumission";

  const { data, error } = await admin.rpc("apply_closure_malus_pt", {
    p_pt_id: ptId,
    p_tester_id: testerId,
    p_project_id: projectId,
    p_kind: kind,
    p_delta: delta,
    p_reason: reason,
  });

  if (error) {
    return { applied: false, rpcAvailable: false };
  }
  return { applied: data === true, rpcAvailable: true };
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
    const res = await tryClaimMalus(admin, pt.id, testerId, projectId, "nda_unsigned");
    if (res.rpcAvailable) {
      ndaUnsignedApplied = res.applied || ndaUnsignedApplied;
      return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
    }
    // Fallback non-atomique (compat).
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
    const res = await tryClaimMalus(admin, pt.id, testerId, projectId, "deadline_exceeded");
    if (res.rpcAvailable) {
      malusApplied = res.applied || malusApplied;
      return { malus_applied: malusApplied, malus_nda_unsigned_applied: ndaUnsignedApplied };
    }
    // Fallback non-atomique (compat).
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

/**
 * Applique les malus de cloture pour TOUS les testeurs d'un projet ferme,
 * meme s'ils ne consultent jamais leur mission. A appeler depuis le cron `close-expired`
 * apres le passage du projet en statut "closed" pour eviter le BUG #11
 * (malus jamais applique si le testeur ne revient pas).
 */
export async function applyClosureMalusForProject(
  admin: AdminClient,
  projectId: string
): Promise<{ nda_unsigned: number; deadline_exceeded: number }> {
  const { data: pts } = await admin
    .from("project_testers")
    .select("id, status, malus_applied, malus_nda_unsigned_applied, tester_id")
    .eq("project_id", projectId);

  let ndaUnsigned = 0;
  let deadlineExceeded = 0;

  for (const pt of (pts ?? []) as Array<
    PtRow & { tester_id: string }
  >) {
    const st = pt.status;

    if (
      (st === "selected" || st === "nda_sent") &&
      !pt.malus_nda_unsigned_applied
    ) {
      const res = await tryClaimMalus(admin, pt.id, pt.tester_id, projectId, "nda_unsigned");
      if (res.rpcAvailable) {
        if (res.applied) ndaUnsigned++;
      } else {
        // Fallback non-atomique (compat).
        await admin.rpc("apply_score_change", {
          p_tester_id: pt.tester_id,
          p_delta: SCORE_DELTA_NDA_UNSIGNED_AT_CLOSURE,
          p_reason: "NDA non signe avant cloture de campagne",
          p_project_id: projectId,
        });
        await admin
          .from("project_testers")
          .update({ malus_nda_unsigned_applied: true })
          .eq("id", pt.id);
        ndaUnsigned++;
      }
      continue;
    }

    if (
      ["nda_signed", "invited", "in_progress"].includes(st) &&
      !pt.malus_applied
    ) {
      const res = await tryClaimMalus(admin, pt.id, pt.tester_id, projectId, "deadline_exceeded");
      if (res.rpcAvailable) {
        if (res.applied) deadlineExceeded++;
      } else {
        // Fallback non-atomique (compat).
        await admin.rpc("apply_score_change", {
          p_tester_id: pt.tester_id,
          p_delta: SCORE_DELTA_MISSION_DEADLINE_EXCEEDED,
          p_reason: "Delai depasse sans soumission",
          p_project_id: projectId,
        });
        await admin
          .from("project_testers")
          .update({ malus_applied: true })
          .eq("id", pt.id);
        deadlineExceeded++;
      }
    }
  }

  return { nda_unsigned: ndaUnsigned, deadline_exceeded: deadlineExceeded };
}
