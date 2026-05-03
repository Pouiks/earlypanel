/**
 * Etat partage des filtres avances testeurs.
 *
 * Utilise par :
 *  - /staff/dashboard/testers (page Testeurs)
 *  - components/staff/ProjectTestersTab (catalogue dans la fiche projet)
 *
 * Centralise pour garantir la meme experience de filtrage partout, et
 * eviter la duplication de la logique URL params.
 */

export interface TesterAdvancedFilterState {
  gender: Set<string>;
  ageMin: string;
  ageMax: string;
  csp: Set<string>;
  sector: Set<string>;
  jobTitle: string;
  companySize: Set<string>;
  digitalLevel: Set<string>;
  connection: Set<string>;
  devices: Set<string>;
  browsers: Set<string>;
  mobileOs: Set<string>;
  location: string;
  tier: Set<string>;
}

export function emptyTesterFilters(): TesterAdvancedFilterState {
  return {
    gender: new Set(),
    ageMin: "",
    ageMax: "",
    csp: new Set(),
    sector: new Set(),
    jobTitle: "",
    companySize: new Set(),
    digitalLevel: new Set(),
    connection: new Set(),
    devices: new Set(),
    browsers: new Set(),
    mobileOs: new Set(),
    location: "",
    tier: new Set(),
  };
}

/** Compte le nombre de filtres actifs (utile pour le badge sur le bouton). */
export function countActiveTesterFilters(f: TesterAdvancedFilterState): number {
  return (
    f.gender.size + f.csp.size + f.sector.size + f.companySize.size +
    f.digitalLevel.size + f.connection.size + f.devices.size +
    f.browsers.size + f.mobileOs.size + f.tier.size +
    (f.jobTitle.trim() ? 1 : 0) +
    (f.ageMin.trim() ? 1 : 0) + (f.ageMax.trim() ? 1 : 0) +
    (f.location.trim() ? 1 : 0)
  );
}

/**
 * Ajoute les params de filtre dans une URLSearchParams existante.
 * N'ecrase rien : le caller a deja set status, search, etc.
 */
export function appendTesterFiltersToParams(
  params: URLSearchParams,
  f: TesterAdvancedFilterState,
): void {
  f.sector.forEach((s) => params.append("sector", s));
  f.csp.forEach((s) => params.append("csp", s));
  f.gender.forEach((s) => params.append("gender", s));
  f.digitalLevel.forEach((s) => params.append("digital_level", s));
  f.connection.forEach((s) => params.append("connection", s));
  f.devices.forEach((s) => params.append("devices", s));
  f.browsers.forEach((s) => params.append("browsers", s));
  f.mobileOs.forEach((s) => params.append("mobile_os", s));
  f.companySize.forEach((s) => params.append("company_size", s));
  f.tier.forEach((s) => params.append("tier", s));
  if (f.jobTitle.trim()) params.set("job_title", f.jobTitle.trim());
  if (f.ageMin.trim()) params.set("age_min", f.ageMin.trim());
  if (f.ageMax.trim()) params.set("age_max", f.ageMax.trim());
  if (f.location.trim()) params.set("location", f.location.trim());
}
