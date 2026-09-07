/**
 * Vocabulaires des champs testeur a valeurs fermees.
 *
 * SOURCE UNIQUE pour l'onboarding (Step4Technical), les filtres staff
 * (TesterAdvancedFilters) et le ciblage projet (ProjectForm). Toute liste
 * dupliquee a la main derive : les filtres staff avaient perdu 3 valeurs
 * d'OS mobile et le formulaire projet ecrivait des genres qui n'existaient
 * pas en base. Secteurs et CSP restent dans src/lib/taxonomy.ts.
 *
 * Ne JAMAIS renommer une valeur ici sans migration des lignes existantes :
 * ce sont les chaines stockees dans `testers`.
 */

export const GENDER_OPTIONS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "non_binary", label: "Non-binaire" },
  { value: "prefer_not_to_say", label: "Ne se prononce pas" },
] as const;
export const GENDER_VALUES = GENDER_OPTIONS.map((g) => g.value);
export const GENDER_LABELS: Record<string, string> = Object.fromEntries(GENDER_OPTIONS.map((g) => [g.value, g.label]));

export const DIGITAL_LEVEL_OPTIONS = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "expert", label: "Expert" },
] as const;

export const CONNECTIONS = ["Fibre", "ADSL", "4G/5G"] as const;

export const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Brave", "Opera", "Arc", "Autre"] as const;

export const DEVICES = [
  "PC Windows", "PC Linux", "Mac",
  "iPhone", "Smartphone Android", "Autre smartphone",
  "iPad", "Tablette Android", "Autre tablette",
] as const;

export const MOBILE_OS = ["iOS", "Android", "HarmonyOS", "Autre", "Aucun smartphone"] as const;

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export const TIER_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
  { value: "premium", label: "Premium" },
] as const;

/**
 * Anciennes valeurs de ciblage projet (libelles francais ecrits par
 * ProjectForm avant la migration 038) -> valeurs DB. Utilise en lecture
 * defensive cote formulaire pour les projets non encore migres.
 */
export const LEGACY_GENDER_MAP: Record<string, string> = {
  Homme: "male",
  Femme: "female",
  Autre: "non_binary",
};

export const LEGACY_CSP_MAP: Record<string, string> = {
  "Cadres / Prof. intellectuelles": "Cadre / Profession intellectuelle supérieure",
  "Professions intermédiaires": "Profession intermédiaire",
  "Employés": "Employé",
  "Ouvriers": "Ouvrier",
  "Retraités": "Retraité",
  "Étudiants": "Étudiant",
  "Artisans / Commerçants": "Indépendant / Auto-entrepreneur",
  "Sans activité": "Sans activité",
};
