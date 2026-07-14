/**
 * Classifieur déterministe : `job_title` (texte libre) → { job_family, seniority }.
 *
 * Pure, sans I/O, testé (tests/unit/job-classifier.test.ts). Remplace l'ancien
 * matching par sous-chaîne sur le titre, qui donnait des faux positifs
 * (« budget » ⊃ « dg ») et laissait la taille d'entreprise décider seule.
 *
 * Principe :
 *  1. On normalise le titre (minuscules, sans accents, apostrophes/tirets/slash
 *     → espaces) pour matcher au MOT (bornes \b), pas à la sous-chaîne.
 *  2. `job_family` : première règle qui matche dans un ordre du plus spécifique
 *     (réglementé/rare) au plus générique.
 *  3. `seniority` : marqueurs explicites (dirigeant > manager > étudiant >
 *     junior > confirmé) ; à défaut, un métier « professionnel » est supposé
 *     `confirmed`, le reste `none`.
 */
import {
  type JobFamily,
  type Seniority,
  PROFESSIONAL_FAMILIES,
} from "./job-taxonomy";

/** minuscules, sans accents, ponctuation de liaison → espaces, espaces compactés. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`.\-/,&()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Règles de famille, ÉVALUÉES DANS L'ORDRE (première qui matche gagne).
 * L'ordre encode la priorité : réglementé/rare d'abord, grand public ensuite.
 */
const FAMILY_RULES: { family: JobFamily; re: RegExp }[] = [
  // --- Professions réglementées du droit ---
  {
    family: "legal-regulated",
    re: /\b(avocat|avocate|notaire|magistrat|magistrate|juge|huissier|commissaire de justice|greffier|greffiere|batonnier|mandataire judiciaire|administrateur judiciaire)\b/,
  },
  // --- Santé support (avant santé réglementée pour éviter les collisions) ---
  {
    family: "health-support",
    re: /\b(aide soignant|aide soignante|auxiliaire de puericulture|auxiliaire de vie|assistant de vie|aide a domicile|preparateur en pharmacie|brancardier|ambulancier|secretaire medicale)\b/,
  },
  // --- Santé réglementée / professions de santé qualifiées ---
  {
    family: "health-regulated",
    re: /\b(medecin|generaliste|chirurgien|chirurgienne|anesthesiste|pediatre|cardiologue|dermatologue|psychiatre|radiologue|urgentiste|gynecologue|ophtalmologue|orl|interne en medecine|infirmier|infirmiere|sage femme|kine|kinesitherapeute|osteopathe|psychologue|orthophoniste|ergotherapeute|dieteticien|dieteticienne|nutritionniste|pharmacien|pharmacienne|dentiste|chirurgien dentiste|orthodontiste|veterinaire|opticien|audioprothesiste|podologue|manipulateur radio|sage femme)\b/,
  },
  // --- Direction / C-level / fondateurs / directeurs de fonction ---
  {
    family: "executive",
    re: /\b(ceo|cfo|coo|cmo|cdo|cto|cio|cpo|cro|chro|ciso|rssi|dsi|daf|drh|pdg)\b|\b(president|presidente|fondateur|fondatrice|cofondateur|cofondatrice|dirigeant|dirigeante|gerant|gerante|chief)\b|\bvice president\b|\bvp\b|chef d entreprise|chef d entreprise|\bdirect(eur|rice) general/,
  },
  // "Directeur/Directrice X" (hors artistique/projet/production/école…) → direction
  {
    family: "executive",
    re: /\bdirect(eur|rice)\b(?!\s+(artistique|de projet|de production|de recherche|d ecole|de these|de clientele|de creation|de la creation|de memoire|adjoint d ecole|de conscience))/,
  },
  // --- Tech / Produit / Data (avant industrie : "ingénieur DevOps" ≠ industrie) ---
  {
    family: "tech-product",
    re: /\b(develop\w*|devops|dev ops|full ?stack|front ?end|back ?end|software|informaticien|programmeur|webmaster|integrateur web|sysadmin|pentester|cyber|cybersecurite)\b|\bingenieur (logiciel|informatique|dev|devops|cloud|reseau|reseaux|systeme|systemes|qa|test|donnees|data|etudes informatiques|securite|cybersecurite|ia|r d|sre)\b|\barchitecte (logiciel|si|cloud|securite|systeme|data|technique)\b|\b(data analyst|data scientist|data engineer|machine learning|ml engineer|analyste bi|business intelligence)\b|\b(product owner|product manager|product designer|scrum master|coach agile|ux|ui|ux ui)\b|\btech lead\b|\blead (dev|developpeur|data|technique)\b|\badministrateur (systeme|systemes|reseau|reseaux|base|bases|bdd|infrastructure)\b|\b(network|helpdesk|technicien (support|informatique|infrastructure|si|reseau))\b|\bchef de projet (web|it|digital|informatique|technique|logiciel|data|produit|si)\b|\bqa\b|\bsre\b/,
  },
  // --- Finance / Compta / Banque / Assurance ---
  {
    family: "finance",
    re: /\b(comptab\w*|expert comptable|aide comptable|auditeur|audit|commissaire aux comptes|controleur de gestion|controle de gestion|controleur financier|analyste financier|analyste credit|analyste risques|tresorier|tresorerie|credit manager|fiscaliste|paie|banquier|banque|conseiller bancaire|conseiller clientele|conseiller patrimonial|gestionnaire de patrimoine|trader|courtier|souscripteur|actuaire|assurance|sinistres|monetique|inspecteur d assurance)\b/,
  },
  // --- Juridique entreprise (non réglementé) ---
  {
    family: "legal",
    re: /\b(juriste|responsable juridique|compliance|conformite|dpo|delegue a la protection|deleguee a la protection|contract manager)\b/,
  },
  // --- RH ---
  {
    family: "hr",
    re: /\b(ressources humaines|recrutement|recruteur|recruteuse|talent|chasseur de tetes|rrh|hrbp|hr business|responsable formation|charge de formation|office manager|happiness manager|administration du personnel|gestionnaire rh|conseiller recrutement)\b/,
  },
  // --- Conseil / Stratégie ---
  {
    family: "consulting",
    re: /\b(consultant|consultante|conseil|strategie|strategy|transformation|associe cabinet|partner)\b/,
  },
  // --- Marketing / Communication ---
  {
    family: "marketing",
    re: /\b(marketing|communication|growth|seo|sea|sem|brand|trafic manager|crm manager|content manager|contenu|social media|community manager|acquisition|email marketing|attache de presse|chef de produit)\b/,
  },
  // --- Commercial / Vente B2B ---
  {
    family: "sales",
    re: /\b(commercial|commerciale|business developer|business development|sales|account executive|account manager|key account|customer success|customer support|sdr|bdr|inside sales|vrp|representant|charge d affaires|chargee d affaires|setter|closer|e commerce|business dev)\b/,
  },
  // --- Immobilier ---
  {
    family: "real-estate",
    re: /\b(immobili\w*|syndic|copropriete|property manager|asset manager|administrateur de biens|negociateur immobilier|agent immobilier|gestionnaire de copropriete)\b/,
  },
  // --- Opérations / Logistique / Projet / Qualité ---
  {
    family: "ops",
    re: /\b(operations|logistique|supply chain|approvisionn\w*|acheteur|achat|responsable qualite|responsable production|planification|ordonnancement|chef de projet|directeur de projet|directrice de projet|responsable de projet|project manager|program manager|pmo|responsable logistique|coordinateur logistique)\b/,
  },
  // --- Création / Médias ---
  {
    family: "creative",
    re: /\b(graphiste|designer|directeur artistique|directrice artistique|motion|photograph\w*|videaste|video|artist|lighting|3d|illustrateur|webdesign|web design|redacteur|redactrice|copywriter|concepteur redacteur|journaliste|realisateur|scenariste|comedien|acteur|actrice|musicien|compositeur|ingenieur du son|monteur|cadreur|regisseur|editeur|producteur|multimedia|audiovisuel|jeux video|game)\b/,
  },
  // --- Éducation / Recherche ---
  {
    family: "education",
    re: /\b(enseignant|enseignante|professeur|professeure|instituteur|institutrice|maitre de conference|doctorant|post doctorant|chercheur|chercheuse|formateur|formatrice|educateur|educatrice|cpe|documentaliste|bibliothecaire|proviseur|coach professionnel|edition scolaire|scolaire)\b/,
  },
  // --- Industrie / Ingénierie non-logicielle ---
  {
    family: "industry",
    re: /\b(ingenieur|technicien|methodes|industrialisation|procedes|genie civil|structure|acoustique|agronome|bureau d etudes|dessinateur industriel|conducteur de travaux|chef de chantier|maintenance|production|qualite)\b/,
  },
  // --- Artisanat / Bâtiment manuel / Cuisine ---
  {
    family: "trades",
    re: /\b(macon|charpentier|plombier|electricien|peintre|couvreur|carreleur|menuisier|soudeur|tourneur|fraiseur|operateur de production|conducteur de ligne|regleur|cuisinier|chef de cuisine|patissier|boulanger|commis|second de cuisine|coiffeur|coiffeuse|estheticien|esteticienne|tatoueur|couturier|tailleur|cordonnier|bijoutier|horloger|fleuriste|artisan)\b/,
  },
  // --- Commerce / Restauration / Hôtellerie ---
  {
    family: "hospitality-retail",
    re: /\b(vendeur|vendeuse|caissier|caissiere|hote de caisse|employe de rayon|employes de rayon|chef de rayon|magasin|boutique|retail|boulangerie|serveur|serveuse|barman|barmaid|sommelier|maitre d hotel|receptionniste|gouvernante|hotel|restaurant|restaurateur|agent de voyages|guide touristique)\b/,
  },
  // --- Transport / Logistique terrain ---
  {
    family: "transport",
    re: /\b(chauffeur|livreur|vtc|taxi|pilote de ligne|hotesse de l air|steward|cheminot|conducteur de train|conducteur de bus|capitaine|marin|facteur|factrice|coursier|routier|cariste|magasinier|preparateur de commandes|manutentionnaire)\b/,
  },
  // --- Agriculture / Agroalimentaire ---
  {
    family: "agriculture",
    re: /\b(agriculteur|agricultrice|maraicher|viticulteur|eleveur|apiculteur|horticulteur|paysagiste|jardinier|forestier|pecheur|agricole|oenologue)\b/,
  },
  // --- Public / Social / Défense ---
  {
    family: "public-social",
    re: /\b(fonctionnaire|territorial|impots|douanier|policier|gendarme|pompier|militaire|officier|diplomate|ambassadeur|travailleur social|assistant social|assistante sociale|portefeuille social|ong|humanitaire|rse|mecenat|fundraiser)\b/,
  },
  // --- Administratif / Accueil ---
  {
    family: "admin",
    re: /\b(secretaire|assistant administratif|assistante administrative|assistant de direction|assistante de direction|standardiste|hote d accueil|hotesse d accueil|agent d accueil|agent administratif|adjoint technique|adjointe technique)\b/,
  },
  // --- Étudiant (sans domaine identifiable) ---
  {
    family: "student",
    re: /\b(etudiant|etudiante|lyceen|lyceenne|eleve)\b/,
  },
  // --- Sans activité ---
  {
    family: "inactive",
    re: /\b(sans activite|sans emploi|sans profession|retraite|retraitee|demandeur d emploi|reconversion|chomeur|chomage)\b/,
  },
];

/** Marqueurs de séniorité. */
const EXEC_RE =
  /\b(ceo|cfo|coo|cmo|cdo|cto|cio|cpo|cro|chro|ciso|rssi|dsi|daf|drh|pdg)\b|\b(president|presidente|fondateur|fondatrice|cofondateur|cofondatrice|dirigeant|dirigeante|gerant|gerante|chief)\b|\bvice president\b|\bvp\b|chef d entreprise/;
const EXEC_DIRECTOR_RE =
  /\bdirect(eur|rice)\b(?!\s+(artistique|de projet|de production|de recherche|d ecole|de these|de clientele|de creation|de la creation|de memoire|de conscience))/;
const MGMT_RE =
  /\b(responsable|manager|chef de|chef d|head of|team lead|lead|encadrant|superviseur|coordinateur|coordinatrice|directeur|directrice)\b/;
const STUDENT_RE = /\b(etudiant|etudiante|alternant|alternante|apprenti|apprentie|stagiaire|lyceen|eleve)\b/;
const JUNIOR_RE = /\b(junior|jr|assistant|assistante|aide|debutant|debutante|adjoint|adjointe)\b/;
const CONFIRMED_RE = /\b(senior|sr|expert|experte|confirme|confirmee|principal|specialiste)\b/;

export function deriveJobFamily(jobTitle: string | null | undefined): JobFamily {
  if (!jobTitle) return "other";
  const n = norm(jobTitle);
  if (!n) return "other";
  for (const { family, re } of FAMILY_RULES) {
    if (re.test(n)) return family;
  }
  return "other";
}

export function deriveSeniority(
  jobTitle: string | null | undefined,
  family: JobFamily
): Seniority {
  if (!jobTitle) return "none";
  const n = norm(jobTitle);
  if (!n) return "none";
  if (EXEC_RE.test(n) || EXEC_DIRECTOR_RE.test(n)) return "executive";
  if (MGMT_RE.test(n)) return "management";
  if (STUDENT_RE.test(n)) return "student";
  if (JUNIOR_RE.test(n)) return "junior";
  if (CONFIRMED_RE.test(n)) return "confirmed";
  // Défaut : un métier professionnel identifié est un confirmé ; sinon rien.
  return PROFESSIONAL_FAMILIES.includes(family) ? "confirmed" : "none";
}

export interface JobClassification {
  job_family: JobFamily;
  seniority: Seniority;
}

/** Classe un intitulé de poste en { job_family, seniority }. */
export function classifyJobTitle(jobTitle: string | null | undefined): JobClassification {
  const job_family = deriveJobFamily(jobTitle);
  const seniority = deriveSeniority(jobTitle, job_family);
  return { job_family, seniority };
}
