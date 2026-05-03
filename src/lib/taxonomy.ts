/**
 * Taxonomie unique de earlypanel.
 *
 * Source de verite UNIQUE pour les listes deroulantes utilisees par
 * l'onboarding testeur, le profil testeur, le formulaire projet, les
 * filtres staff et la matrice de diversite.
 *
 * Si tu changes ces listes, fais-le ICI uniquement. La DB ne pose pas
 * de CHECK contraint pour permettre l'evolution sans migration ; la
 * coherence est assuree par cette source de verite cote application.
 */

// =====================================================================
// Secteurs d'activite (de l'entreprise du testeur)
// =====================================================================

export const SECTORS = [
  "Tech / IT / Software",
  "Finance / Banque",
  "Assurance",
  "Santé / Pharma",
  "Comptabilité / Expertise comptable",
  "Recherche / R&D",
  "Éducation / Formation",
  "Industrie / Manufacturing",
  "Agroalimentaire",
  "BTP / Construction / Architecture",
  "Énergie",
  "Transport / Logistique",
  "Commerce / Retail",
  "E-commerce",
  "Tourisme / Hôtellerie / Restauration",
  "Médias / Communication",
  "Marketing / Publicité",
  "RH / Recrutement",
  "Juridique",
  "Immobilier",
  "Conseil / Services aux entreprises",
  "Fonction publique / Administration",
  "Associatif / ONG",
  "Agriculture",
  "Autre",
] as const;

export type Sector = (typeof SECTORS)[number];

export function isValidSector(value: string | null | undefined): value is Sector {
  if (!value) return false;
  return (SECTORS as readonly string[]).includes(value);
}

// =====================================================================
// CSP (Categorie Socio-Professionnelle, alignee INSEE simplifiee)
// =====================================================================

export const CSPS = [
  "Étudiant",
  "Cadre / Profession intellectuelle supérieure",
  "Profession intermédiaire",
  "Employé",
  "Indépendant / Auto-entrepreneur",
  "Ouvrier",
  "Retraité",
  "Sans activité",
] as const;

export type Csp = (typeof CSPS)[number];

export function isValidCsp(value: string | null | undefined): value is Csp {
  if (!value) return false;
  return (CSPS as readonly string[]).includes(value);
}

// =====================================================================
// Tranches d'age (pour la matrice de diversite + suggestions filtres)
// =====================================================================

export interface AgeBucket {
  label: string;
  min: number;
  max: number;
}

export const AGE_BUCKETS: AgeBucket[] = [
  { label: "18-24 ans", min: 18, max: 24 },
  { label: "25-34 ans", min: 25, max: 34 },
  { label: "35-44 ans", min: 35, max: 44 },
  { label: "45-54 ans", min: 45, max: 54 },
  { label: "55-64 ans", min: 55, max: 64 },
  { label: "65+ ans", min: 65, max: 200 },
];

// =====================================================================
// Helpers
// =====================================================================

/**
 * Calcule l'age en annees pleines a partir d'une date de naissance.
 * Retourne null si birth_date est invalide / manquante.
 * Robuste aux fuseaux horaires (compare uniquement annee/mois/jour).
 */
export function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

/** Retourne le label du bucket d'age (ex: "25-34 ans") ou null. */
export function ageBucketLabel(age: number | null | undefined): string | null {
  if (age === null || age === undefined) return null;
  for (const b of AGE_BUCKETS) {
    if (age >= b.min && age <= b.max) return b.label;
  }
  return null;
}
