/**
 * Taxonomie métier des testeurs — source de vérité de la classification.
 *
 * Deux axes indépendants, dérivés du `job_title` (texte libre saisi par le
 * testeur) :
 *  - `job_family`  : CE QUE le testeur fait (domaine / fonction).
 *  - `seniority`   : À QUEL NIVEAU il l'exerce.
 *
 * Ces deux valeurs alimentent le matching des personas (cf. persona-matcher.ts)
 * et donc l'indemnité versée. Elles remplacent l'ancien matching par mots-clés
 * bruts sur le titre, qui produisait des faux positifs (« budget » ⊃ « dg »)
 * et ignorait totalement le métier au profit de la taille d'entreprise.
 *
 * Les valeurs ci-dessous sont AUTORITAIRES : la migration 036 pose une
 * contrainte CHECK sur `testers.job_family` / `testers.seniority` avec
 * exactement ces listes. N'ajouter une valeur ici qu'en l'ajoutant aussi à la
 * contrainte (nouvelle migration).
 */

/** Familles de métier. Ordre indicatif : des plus « rares/qualifiées » au grand public. */
export const JOB_FAMILIES = [
  // Rares / réglementées → cœur de cible haute valeur
  "health-regulated", // médecin, chirurgien, pharmacien, dentiste, infirmier, kiné, psychologue…
  "legal-regulated", // avocat, notaire, magistrat, huissier, greffier
  "executive", // direction générale, C-level, fondateur, directeurs de fonction
  // Fonctions cadres / expertes à valeur
  "tech-product", // dev, data, IT, devops, cyber, produit, UX/UI produit, archi SI
  "finance", // compta, contrôle de gestion, audit, banque, assurance, paie
  "legal", // juriste d'entreprise, compliance, DPO
  "consulting", // conseil, stratégie
  "hr", // recrutement, RH, formation interne
  "marketing", // marketing, communication, growth, SEO, contenu
  "sales", // commercial B2B, business dev, account, e-commerce
  "ops", // opérations, logistique, supply, achats, qualité, gestion de projet
  // Métiers qualifiés mais hors cible « rareté digitale »
  "real-estate", // agent immobilier, syndic, gestionnaire de copropriété
  "creative", // graphiste, DA, motion, photo, vidéo, rédaction, médias
  "education", // enseignement, formation, recherche
  "health-support", // aide-soignant, auxiliaire, assistant de vie, préparateur pharmacie
  "public-social", // fonction publique, social, ONG, défense
  "industry", // ingénierie industrielle, production, maintenance, BTP technique
  "trades", // artisanat, bâtiment manuel, cuisine
  "hospitality-retail", // vente magasin, caisse, restauration, hôtellerie
  "transport", // chauffeur, livreur, facteur, conducteur
  "agriculture", // agriculture, agroalimentaire, espaces verts
  "admin", // secrétariat, accueil, assistanat administratif
  "student", // étudiant sans métier identifiable
  "inactive", // sans activité, retraité, demandeur d'emploi, reconversion
  "other", // non classable
] as const;

export type JobFamily = (typeof JOB_FAMILIES)[number];

/** Niveaux de séniorité, du plus élevé au plus bas. */
export const SENIORITIES = [
  "executive", // dirigeant / C-level / fondateur
  "management", // manager, responsable, chef de, head of, directeur (hors DG)
  "confirmed", // senior / expert / professionnel établi
  "junior", // débutant, assistant, aide-
  "student", // étudiant, alternant, apprenti, stagiaire
  "none", // pas de séniorité pertinente (sans activité, métier non pro)
] as const;

export type Seniority = (typeof SENIORITIES)[number];

/**
 * Familles considérées « professionnelles » : quand aucun marqueur de
 * séniorité n'est détecté dans le titre, on suppose un professionnel
 * `confirmed` (un « Développeur » sans autre mention est un pro établi).
 * Pour les autres familles (grand public), l'absence de marqueur → `none`.
 */
export const PROFESSIONAL_FAMILIES: readonly JobFamily[] = [
  "health-regulated",
  "legal-regulated",
  "executive",
  "tech-product",
  "finance",
  "legal",
  "consulting",
  "hr",
  "marketing",
  "sales",
  "ops",
];

/** Libellés FR pour l'affichage staff (éditeur de persona, colonnes testeurs). */
export const JOB_FAMILY_LABELS: Record<JobFamily, string> = {
  "health-regulated": "Santé réglementée",
  "legal-regulated": "Droit réglementé",
  executive: "Direction / C-level",
  "tech-product": "Tech / Produit / Data",
  finance: "Finance / Compta",
  legal: "Juridique (entreprise)",
  consulting: "Conseil / Stratégie",
  hr: "Ressources humaines",
  marketing: "Marketing / Communication",
  sales: "Commercial / Vente",
  ops: "Opérations / Projet",
  "real-estate": "Immobilier",
  creative: "Création / Médias",
  education: "Éducation / Recherche",
  "health-support": "Santé (support)",
  "public-social": "Public / Social",
  industry: "Industrie / Ingénierie",
  trades: "Artisanat / Bâtiment",
  "hospitality-retail": "Commerce / Restauration",
  transport: "Transport / Logistique",
  agriculture: "Agriculture",
  admin: "Administratif / Accueil",
  student: "Étudiant",
  inactive: "Sans activité",
  other: "Autre",
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  executive: "Dirigeant",
  management: "Manager",
  confirmed: "Confirmé",
  junior: "Junior",
  student: "Étudiant",
  none: "Non applicable",
};

export function isJobFamily(v: unknown): v is JobFamily {
  return typeof v === "string" && (JOB_FAMILIES as readonly string[]).includes(v);
}
export function isSeniority(v: unknown): v is Seniority {
  return typeof v === "string" && (SENIORITIES as readonly string[]).includes(v);
}
