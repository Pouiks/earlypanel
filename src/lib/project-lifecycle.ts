/**
 * Regles metier : statut projet (draft/active/closed/archived) vs actions testeur et campagne staff.
 */

export type ProjectLifecycleStatus = "draft" | "active" | "closed" | "archived";

/**
 * Periode de grace : 24h apres l'end_date pendant lesquelles un testeur en cours
 * peut encore sauvegarder/soumettre, meme si le cron `close-expired` a ferme le projet.
 * Evite de perdre le travail d'un testeur qui finit dans les dernieres minutes.
 */
export const MISSION_CLOSURE_GRACE_MS = 24 * 60 * 60 * 1000;

export function projectAllowsTesterWork(projectStatus: string): boolean {
  return projectStatus === "active";
}

/**
 * Comme `projectAllowsTesterWork` mais accorde la fenetre de grace post-cloture
 * (jusqu'a 24h apres end_date) afin que les testeurs en cours puissent finir.
 * A utiliser pour les actions de sauvegarde et de soumission.
 */
export function projectAllowsTesterWorkWithGrace(
  projectStatus: string,
  endDate: string | null
): boolean {
  if (projectStatus !== "active" && projectStatus !== "closed") {
    return false;
  }
  if (!endDate) {
    return projectStatus === "active";
  }
  const endTs = new Date(endDate).getTime();
  if (Number.isNaN(endTs)) {
    return projectStatus === "active";
  }
  // Avant la deadline : seul "active" autorise.
  if (Date.now() < endTs) {
    return projectStatus === "active";
  }
  // Apres la deadline : grace 24h, que le cron ait deja ferme ou non.
  return Date.now() - endTs < MISSION_CLOSURE_GRACE_MS;
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
