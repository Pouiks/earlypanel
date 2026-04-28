/**
 * Source unique de verite pour les champs requis du profil testeur.
 *
 * IMPORTANT : cette liste DOIT rester en phase avec le trigger PostgreSQL
 * `auto_activate_tester()` (cf. migrations 004 + 026). Tout ajout/retrait
 * doit etre fait simultanement cote DB et cote app, sinon :
 *   - Champ ajoute cote app sans DB → l'app dit "incomplet" mais le trigger
 *     active quand meme le testeur. Inconsistance.
 *   - Champ ajoute cote DB sans app → le testeur ne peut jamais s'activer
 *     car l'onboarding n'a pas le formulaire pour ce champ.
 *
 * Utilise par :
 *   - /api/testers/notifications (badge "Mon profil")
 *   - /app/dashboard/profil (panel "champs a completer")
 *   - /api/staff/projects/:id/testers/invite (defense en profondeur)
 *   - /api/staff/projects/:id/testers (defense en profondeur)
 *   - ProjectTestersTab (desactivation checkbox UI)
 */

export type RequiredFieldCategory =
  | "personal"
  | "address"
  | "professional"
  | "technical"
  | "preferences";

export interface RequiredFieldInfo {
  /** Cle de la colonne sur la table `testers` */
  key: string;
  /** Label utilisateur (FR) pour message d'erreur ou panneau profil */
  label: string;
  /** Categorie pour grouper l'affichage */
  category: RequiredFieldCategory;
  /** true si tableau (au moins 1 element), false si texte/scalaire */
  isArray: boolean;
}

/**
 * Liste canonique des 18 champs requis pour qu'un testeur passe en
 * status='active' et soit eligible aux invitations / NDA.
 *
 * Ordre choisi pour reproduire l'ordre du formulaire d'onboarding et
 * du panel profil → ameliore l'UX du panneau "X champs a completer".
 */
export const REQUIRED_FIELDS: RequiredFieldInfo[] = [
  // Personnel (5)
  { key: "first_name", label: "Prénom", category: "personal", isArray: false },
  { key: "last_name", label: "Nom", category: "personal", isArray: false },
  { key: "phone", label: "Téléphone", category: "personal", isArray: false },
  { key: "birth_date", label: "Date de naissance", category: "personal", isArray: false },

  // Adresse (3) — requis pour NDA legal
  { key: "address", label: "Adresse postale", category: "address", isArray: false },
  { key: "postal_code", label: "Code postal", category: "address", isArray: false },
  { key: "city", label: "Ville", category: "address", isArray: false },

  // Professionnel (3)
  { key: "job_title", label: "Métier / poste", category: "professional", isArray: false },
  { key: "sector", label: "Secteur d'activité", category: "professional", isArray: false },
  { key: "company_size", label: "Taille de l'entreprise", category: "professional", isArray: false },

  // Technique (4)
  { key: "digital_level", label: "Niveau digital", category: "technical", isArray: false },
  { key: "connection", label: "Type de connexion", category: "technical", isArray: false },
  { key: "browsers", label: "Navigateurs utilisés", category: "technical", isArray: true },
  { key: "devices", label: "Appareils", category: "technical", isArray: true },

  // Preferences / autres (4)
  { key: "tools", label: "Outils du quotidien", category: "preferences", isArray: true },
  { key: "interests", label: "Centres d'intérêt", category: "preferences", isArray: true },
  { key: "availability", label: "Disponibilité", category: "preferences", isArray: false },
  { key: "ux_experience", label: "Expérience UX", category: "preferences", isArray: false },
];

/**
 * Mapping step onboarding → champs requis pour valider cette etape.
 *
 * Source de verite pour la validation API (`/api/testers/onboarding/step`)
 * et pour les composants UI (`StepXPersonal/Professional/...`).
 *
 * IMPORTANT : la liste totale (concatenation de toutes les valeurs) DOIT
 * matcher REQUIRED_FIELDS et le trigger DB `auto_activate_tester`. Si un
 * champ est dans REQUIRED_FIELDS mais absent de STEP_FIELDS, l'utilisateur
 * pourra terminer l'onboarding sans le renseigner et restera bloque en
 * status='pending' (le trigger refusera l'activation, comme browncarenza).
 */
export const STEP_FIELDS: Record<number, string[]> = {
  1: ["first_name", "last_name", "phone", "birth_date", "address", "city", "postal_code"],
  2: ["job_title", "sector", "company_size", "digital_level"],
  3: ["tools"],
  4: ["browsers", "devices", "connection"],
  5: ["availability", "ux_experience", "interests"],
};

/**
 * Verifie qu'un objet partial du tester est valide pour une step donnee.
 * Retourne la liste des champs encore vides (vide = step OK).
 */
export function checkStepCompleteness(
  step: number,
  data: Record<string, unknown>
): string[] {
  const fields = STEP_FIELDS[step] ?? [];
  const missing: string[] = [];
  for (const key of fields) {
    const fieldInfo = REQUIRED_FIELDS.find((f) => f.key === key);
    const value = data[key];
    const empty = fieldInfo?.isArray
      ? !Array.isArray(value) || value.length === 0
      : value === null || value === undefined || (typeof value === "string" && value.trim() === "");
    if (empty) missing.push(key);
  }
  return missing;
}

export const CATEGORY_LABELS: Record<RequiredFieldCategory, string> = {
  personal: "Informations personnelles",
  address: "Adresse postale",
  professional: "Profil professionnel",
  technical: "Configuration technique",
  preferences: "Disponibilités & préférences",
};

export interface ProfileCompletenessResult {
  /** Liste des champs encore vides */
  missing: RequiredFieldInfo[];
  /** Nombre de champs manquants (pour le badge "(X)") */
  count: number;
  /** True si tous les champs requis sont remplis */
  isComplete: boolean;
  /** Groupement par categorie pour affichage UI structure */
  missingByCategory: Record<RequiredFieldCategory, RequiredFieldInfo[]>;
}

function isEmptyText(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  // Pour birth_date stocke en string ISO ou Date Object → considere "rempli"
  // si different de null/undefined.
  return false;
}

function isEmptyArray(value: unknown): boolean {
  if (!Array.isArray(value)) return true;
  return value.length === 0;
}

/**
 * Calcule l'etat de completude d'un objet `testers`.
 *
 * @param tester  Ligne `testers` (peut etre partielle, null ou undefined)
 * @returns       Detail des champs manquants + booleen de completude
 *
 * Si `tester` est null/undefined, retourne tous les champs comme manquants.
 */
export function computeProfileCompleteness(
  tester: Record<string, unknown> | null | undefined
): ProfileCompletenessResult {
  const missing: RequiredFieldInfo[] = [];

  if (!tester) {
    const all = [...REQUIRED_FIELDS];
    return {
      missing: all,
      count: all.length,
      isComplete: false,
      missingByCategory: groupByCategory(all),
    };
  }

  for (const field of REQUIRED_FIELDS) {
    const value = tester[field.key];
    const empty = field.isArray ? isEmptyArray(value) : isEmptyText(value);
    if (empty) missing.push(field);
  }

  return {
    missing,
    count: missing.length,
    isComplete: missing.length === 0,
    missingByCategory: groupByCategory(missing),
  };
}

function groupByCategory(
  fields: RequiredFieldInfo[]
): Record<RequiredFieldCategory, RequiredFieldInfo[]> {
  const acc: Record<RequiredFieldCategory, RequiredFieldInfo[]> = {
    personal: [],
    address: [],
    professional: [],
    technical: [],
    preferences: [],
  };
  for (const f of fields) acc[f.category].push(f);
  return acc;
}

/**
 * Garde booleenne pratique pour les routes serveur.
 * Renvoie true UNIQUEMENT si le testeur est `active` ET a tous les champs
 * requis. Defense en profondeur : meme si `profile_completed` est mal mis
 * a jour cote DB (edge case), cette fonction recalcule sur le contenu reel.
 */
export function isTesterEligibleForInvitation(
  tester: Record<string, unknown> | null | undefined
): boolean {
  if (!tester) return false;
  if (tester.status !== "active") return false;
  if (tester.profile_completed !== true) return false;
  return computeProfileCompleteness(tester).isComplete;
}
