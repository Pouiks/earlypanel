/**
 * Cible client d'un projet : types, vocabulaires et libelles.
 *
 * Deux sources combinees dans `ProjectTarget` (voir target-match.ts) :
 *   - colonnes historiques `projects.target_*` : genre, age, CSP, secteur, villes
 *   - `projects.target_criteria` (JSONB, migration 039) : le reste
 *
 * Chaque critere est « souhaite » par defaut (il note) et devient
 * « obligatoire » (il filtre) s'il figure dans `required`. Principe : avec
 * un petit panel on exclut seulement l'impossible, on classe le reste.
 */

export const CRITERION_KEYS = [
  "gender", "age", "csp", "sector", "locations",
  "persona", "job_title", "company_size", "digital_level",
  "devices", "browsers", "mobile_os", "connection",
  "tools", "interests", "availability", "ux_experience",
] as const;
export type CriterionKey = (typeof CRITERION_KEYS)[number];

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  gender: "Genre",
  age: "Âge",
  csp: "CSP",
  sector: "Secteur",
  locations: "Localisation",
  persona: "Persona",
  job_title: "Métier",
  company_size: "Taille d'entreprise",
  digital_level: "Niveau digital",
  devices: "Appareils",
  browsers: "Navigateurs",
  mobile_os: "OS mobile",
  connection: "Connexion",
  tools: "Outils",
  interests: "Centres d'intérêt",
  availability: "Disponibilité",
  ux_experience: "Expérience UX",
};

/** Contenu de projects.target_criteria. Tous les champs sont optionnels en base. */
export interface TargetCriteria {
  required: CriterionKey[];
  persona_ids: string[];
  /** Mots-cles metier separes par des virgules ; un seul suffit (OR). */
  job_title: string;
  company_sizes: string[];
  digital_levels: string[];
  devices: string[];
  browsers: string[];
  mobile_os: string[];
  connections: string[];
  tools: string[];
  interests: string[];
  availability: string[];
  ux_experience: string[];
}

export function emptyTargetCriteria(): TargetCriteria {
  return {
    required: [],
    persona_ids: [],
    job_title: "",
    company_sizes: [],
    digital_levels: [],
    devices: [],
    browsers: [],
    mobile_os: [],
    connections: [],
    tools: [],
    interests: [],
    availability: [],
    ux_experience: [],
  };
}

/** Lecture defensive du JSONB (peut etre {}, null, ou partiel). */
export function parseTargetCriteria(raw: unknown): TargetCriteria {
  const base = emptyTargetCriteria();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    required: strs(o.required).filter((k): k is CriterionKey => (CRITERION_KEYS as readonly string[]).includes(k)),
    persona_ids: strs(o.persona_ids),
    job_title: typeof o.job_title === "string" ? o.job_title : "",
    company_sizes: strs(o.company_sizes),
    digital_levels: strs(o.digital_levels),
    devices: strs(o.devices),
    browsers: strs(o.browsers),
    mobile_os: strs(o.mobile_os),
    connections: strs(o.connections),
    tools: strs(o.tools),
    interests: strs(o.interests),
    availability: strs(o.availability),
    ux_experience: strs(o.ux_experience),
  };
}

// Vocabulaires des criteres qui n'ont pas de liste dans tester-vocab
// (memes valeurs que l'onboarding Step3 / Step5).
export const INTEREST_OPTIONS = [
  "Sites web", "Applications mobiles", "Logiciels professionnels",
  "E-commerce / shopping", "Banque / finance", "Santé",
  "Éducation", "Réseaux sociaux", "Jeux vidéo", "Autre",
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "1-2", label: "1 à 2 missions / mois" },
  { value: "3-5", label: "3 à 5 missions / mois" },
  { value: "5+", label: "5+ missions / mois" },
] as const;

export const UX_EXPERIENCE_OPTIONS = [
  { value: "Jamais", label: "Jamais testé" },
  { value: "Quelquefois", label: "Déjà testé 1-2 fois" },
  { value: "Régulièrement", label: "Teste régulièrement" },
] as const;

export const TOOL_OPTIONS = [
  "Google (Gmail, Drive, Docs)", "Microsoft 365 (Word, Excel)", "Outlook", "WhatsApp", "Messenger",
  "Teams", "Slack", "Zoom", "Google Meet", "Discord",
  "Notion", "Trello", "Asana", "Jira", "Monday", "ClickUp",
  "Instagram", "TikTok", "LinkedIn", "Facebook", "X (Twitter)", "Snapchat",
  "Amazon", "Leboncoin", "Vinted", "Shopify", "PrestaShop",
  "App bancaire mobile", "PayPal", "Lydia / Sumeria", "Pennylane", "Sage", "QuickBooks",
  "Salesforce", "HubSpot", "Pipedrive", "Freshworks", "Zendesk",
  "GitHub", "GitLab", "VS Code", "AWS", "Azure", "TestFlight",
  "Figma", "Canva", "Adobe Creative", "CapCut",
  "Lucca", "Payfit", "BambooHR", "Workday",
  "Doctolib", "Ameli", "MyFitnessPal",
  "Uber / Bolt", "Waze / Google Maps", "SNCF Connect", "Deliveroo / UberEats",
] as const;
