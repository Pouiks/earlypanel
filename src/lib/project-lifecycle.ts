/**
 * Regles metier : statut projet (draft/active/closed/archived) vs actions testeur et campagne staff.
 */

export type ProjectLifecycleStatus = "draft" | "active" | "closed" | "archived";

export function projectAllowsTesterWork(projectStatus: string): boolean {
  return projectStatus === "active";
}

/** Lecture mission (liste + detail) : actif, ou historique si mission deja terminee. */
export function projectAllowsTesterMissionVisibility(
  projectStatus: string,
  ptStatus: string
): boolean {
  if (projectStatus === "active") return true;
  return ptStatus === "completed";
}

/** Preparation : assigner des testeurs en brouillon ou actif. */
export function projectAllowsStaffAssignTesters(projectStatus: string): boolean {
  return projectStatus === "draft" || projectStatus === "active";
}

/** Envoi NDA : brouillon (passe actif au moment de l'envoi) ou deja actif. */
export function projectAllowsNdaSend(projectStatus: string): boolean {
  return projectStatus === "draft" || projectStatus === "active";
}

export function projectIsClosedForCampaign(projectStatus: string): boolean {
  return projectStatus === "closed" || projectStatus === "archived";
}
