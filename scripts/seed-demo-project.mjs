// =====================================================================
// Seed d'un jeu de démonstration : 1 client B2B + 1 projet actif (3 mois)
// + 3 scénarios (critères de réussite, questions typées, une question
// conditionnelle) + 2 questions générales + NDA par défaut.
//
//   node scripts/seed-demo-project.mjs            # crée (refuse si déjà présent)
//   node scripts/seed-demo-project.mjs --delete   # supprime le client + le projet démo
//   node scripts/seed-demo-project.mjs --recreate # supprime puis recrée (dates recalées sur aujourd'hui)
//
// Cible la base pointée par .env.local (service role, RLS contournée).
// Aucun testeur n'est assigné : le projet est prêt pour une démo de
// sélection / invitation / NDA / mission.
// =====================================================================

import { loadEnv } from "./e2e/lib.mjs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const env = loadEnv(ROOT);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
  process.exit(1);
}

const CLIENT_NAME = "Kalvi";
const PROJECT_TITLE = "Parcours de création de devis (v2)";
const DURATION_DAYS = 91; // ≈ 3 mois

// ---------------------------------------------------------------------
// Mini client PostgREST (service role)
// ---------------------------------------------------------------------
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(method, path, body, prefer) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status} : ${text}`);
  return text ? JSON.parse(text) : null;
}
const select = (table, query) => rest("GET", `${table}?${query}`);
const insert = (table, rows) => rest("POST", table, rows, "return=representation");
const remove = (table, query) => rest("DELETE", `${table}?${query}`, undefined, "return=representation");

// ---------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------
async function deleteDemo() {
  const projects = await select("projects", `title=eq.${encodeURIComponent(PROJECT_TITLE)}&select=id,ref_number`);
  for (const p of projects) {
    await remove("projects", `id=eq.${p.id}`); // cascade : use cases, critères, questions, NDA, testeurs
    console.log(`  - projet ${p.ref_number} supprimé`);
  }
  const clients = await select("b2b_clients", `company_name=eq.${encodeURIComponent(CLIENT_NAME)}&select=id`);
  for (const c of clients) {
    await remove("b2b_clients", `id=eq.${c.id}`);
    console.log(`  - client ${CLIENT_NAME} supprimé`);
  }
  if (!projects.length && !clients.length) console.log("  (rien à supprimer)");
}

// ---------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------
async function createDemo() {
  const existing = await select("projects", `title=eq.${encodeURIComponent(PROJECT_TITLE)}&select=id,ref_number`);
  if (existing.length) {
    console.log(`Le projet démo existe déjà (${existing[0].ref_number}). Utilisez --recreate pour le recréer.`);
    return;
  }

  const [staff] = await select("staff_members", "select=id,email&order=created_at.asc&limit=1");
  const createdBy = staff?.id ?? null;

  // 1. Client
  const [client] = await insert("b2b_clients", {
    company_name: CLIENT_NAME,
    sector: "Tech / IT / Software",
    website: "https://kalvi.example",
    company_size: "11-50",
    contact_first_name: "Claire",
    contact_last_name: "Marchand",
    contact_email: "claire.marchand@kalvi.example",
    contact_phone: "06 12 34 56 78",
    contact_role: "Product Manager",
    notes: "Client de démonstration (fictif). Logiciel de facturation pour indépendants et TPE.",
    status: "active",
    created_by: createdBy,
  });
  console.log(`  + client ${client.company_name}`);

  // 2. Projet
  const start = new Date();
  start.setUTCHours(7, 0, 0, 0);
  const end = new Date(start.getTime() + DURATION_DAYS * 86400 * 1000);
  end.setUTCHours(16, 0, 0, 0);

  const [project] = await insert("projects", {
    created_by: createdBy,
    client_id: client.id,
    status: "active",
    title: PROJECT_TITLE,
    description:
      "<p>Kalvi est un logiciel de facturation en ligne pour indépendants et très petites entreprises. " +
      "La nouvelle version du parcours de devis regroupe la création, la remise et l'envoi sur un seul écran.</p>" +
      "<p>Le test porte sur la version de préproduction : les testeurs découvrent le produit, créent un devis, " +
      "le transforment en facture et relancent un impayé, sans aide de l'équipe.</p>",
    company_name: CLIENT_NAME,
    sector: "Tech / IT / Software",
    contact_first_name: "Claire",
    contact_last_name: "Marchand",
    contact_email: "claire.marchand@kalvi.example",
    contact_phone: "06 12 34 56 78",
    urls: ["https://app.kalvi.example"],
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    test_type: "unmoderated",
    audit_enabled: false,
    business_objective:
      "Vérifier qu'un indépendant qui découvre Kalvi crée et envoie son premier devis sans aide, " +
      "et identifier les points de friction avant le déploiement de la v2 à tous les comptes.",
    scope_included: [
      "Création d'un devis depuis le tableau de bord",
      "Application d'une remise sur une ligne",
      "Transformation d'un devis en facture et envoi par email",
      "Relance d'une facture impayée",
    ],
    scope_excluded: [
      "Inscription et paramétrage du compte (compte de test fourni)",
      "Module de comptabilité et exports",
      "Application mobile native",
    ],
    client_guidelines:
      "Environnement de préproduction avec un compte de test déjà paramétré (identifiants transmis dans la mission). " +
      "Les emails envoyés depuis l'environnement de test n'atteignent aucun vrai client. " +
      "Ne pas modifier les paramètres de l'entreprise de test.",
    target_gender: ["female", "male"],
    target_age_min: 25,
    target_age_max: 60,
    target_csp: ["Indépendant / Auto-entrepreneur", "Cadre / Profession intellectuelle supérieure"],
    target_sector: "",
    target_sector_restricted: false,
    target_locations: [],
    target_criteria: {
      required: ["job_title"],
      persona_ids: [],
      job_title: "indépendant, freelance, gérant, artisan, consultant, auto-entrepreneur",
      company_sizes: ["1-10"],
      digital_levels: ["intermediaire", "avance"],
      devices: ["PC Windows", "Mac", "iPhone", "Smartphone Android"],
      browsers: [],
      mobile_os: [],
      connections: [],
      tools: [],
      interests: ["Logiciels professionnels"],
      availability: [],
      ux_experience: [],
    },
    target_headcount: 10,
    base_reward_cents: null,
    tier_rewards: null,
    quote_amount_cents: 280000,
    deposit_paid_at: start.toISOString().slice(0, 10),
    balance_paid_at: null,
  });
  console.log(`  + projet ${project.ref_number} : ${start.toISOString().slice(0, 10)} -> ${end.toISOString().slice(0, 10)}`);

  // 3. Scénarios
  const scenarios = [
    {
      title: "Créer son premier devis",
      task_wording:
        "Vous venez de signer une mission de 3 jours avec un nouveau client, Atelier Dupont, à 450 € HT par jour. " +
        "Créez le devis correspondant dans Kalvi, appliquez une remise de 10 % sur la ligne, puis enregistrez-le. " +
        "Ne cherchez pas d'aide : faites comme si vous étiez seul avec l'outil.",
      expected_testers_count: 10,
      criteria: [
        { label: "Le devis apparaît dans la liste des devis avec le statut Brouillon", is_primary: true },
        { label: "La remise de 10 % est appliquée sur la ligne", is_primary: false },
        { label: "Le total affiché est correct (1 215 € HT, 1 458 € TTC)", is_primary: false },
      ],
      questions: [
        { question_text: "Avez-vous réussi à créer le devis et à l'enregistrer ?", question_type: "binary" },
        {
          question_text: "Qu'est-ce qui vous a empêché d'aller au bout ?",
          question_type: "text",
          question_hint: "Décrivez précisément l'endroit où vous étiez et ce que vous attendiez.",
          min_chars_hint: 80,
          parent: 0,
          when: ["no", "partial"],
        },
        { question_text: "Notez la facilité de création du devis de 1 (très difficile) à 5 (très facile).", question_type: "scale_1_5" },
        {
          question_text: "Où avez-vous hésité pour appliquer la remise ?",
          question_type: "text",
          question_hint: "Sur quoi avez-vous cliqué en premier ? Où pensiez-vous que la remise se trouvait ?",
          min_chars_hint: 120,
        },
        {
          question_text: "Le montant affiché vous a-t-il semblé juste au premier coup d'œil ?",
          question_type: "text",
          question_hint: "HT, TVA, TTC : avez-vous compris ce qui était affiché ?",
        },
      ],
    },
    {
      title: "Transformer le devis en facture et l'envoyer",
      task_wording:
        "Atelier Dupont a accepté votre devis. Transformez-le en facture, vérifiez la date d'échéance (30 jours), " +
        "puis envoyez la facture par email à contact@atelier-dupont.example.",
      expected_testers_count: 10,
      criteria: [
        { label: "La facture est créée à partir du devis et envoyée", is_primary: true },
        { label: "La date d'échéance à 30 jours est visible avant l'envoi", is_primary: false },
      ],
      questions: [
        { question_text: "Avez-vous réussi à envoyer la facture ?", question_type: "binary" },
        {
          question_text: "À quel moment avez-vous été bloqué ?",
          question_type: "text",
          question_hint: "Décrivez l'écran et le bouton que vous cherchiez.",
          min_chars_hint: 80,
          parent: 0,
          when: ["no", "partial"],
        },
        { question_text: "Notez la clarté de l'étape « devis vers facture » de 1 à 5.", question_type: "scale_1_5" },
        {
          question_text: "Avant d'envoyer, saviez-vous ce que le client allait recevoir ?",
          question_type: "text",
          question_hint: "Aperçu, contenu de l'email, pièce jointe : qu'avez-vous compris ?",
          min_chars_hint: 100,
        },
      ],
    },
    {
      title: "Retrouver une facture impayée et relancer le client",
      task_wording:
        "Une facture envoyée le mois dernier à Studio Lemaire n'a pas été payée. " +
        "Retrouvez-la, vérifiez son retard, et envoyez une relance au client.",
      expected_testers_count: 10,
      criteria: [
        { label: "La relance est envoyée depuis la facture en retard", is_primary: true },
        { label: "Le testeur a identifié le nombre de jours de retard sans le calculer lui-même", is_primary: false },
      ],
      questions: [
        { question_text: "Avez-vous retrouvé la facture impayée sans utiliser la recherche ?", question_type: "binary" },
        { question_text: "Notez la facilité pour repérer les factures en retard de 1 à 5.", question_type: "scale_1_5" },
        {
          question_text: "Qu'avez-vous pensé du contenu de la relance proposée ?",
          question_type: "text",
          question_hint: "Ton, informations présentes, ce que vous auriez modifié avant d'envoyer.",
          min_chars_hint: 100,
        },
      ],
    },
  ];

  for (const [order, s] of scenarios.entries()) {
    const [uc] = await insert("project_use_cases", {
      project_id: project.id,
      title: s.title,
      task_wording: s.task_wording,
      order,
      expected_testers_count: s.expected_testers_count,
    });

    await insert(
      "use_case_success_criteria",
      s.criteria.map((c, i) => ({ use_case_id: uc.id, label: c.label, is_primary: c.is_primary, order: i })),
    );

    // Questions en deux passes : les parents d'abord, puis les conditionnelles.
    const ids = [];
    for (const [i, q] of s.questions.entries()) {
      if (q.parent !== undefined) continue;
      const [row] = await insert("project_questions", {
        project_id: project.id,
        use_case_id: uc.id,
        position: i,
        question_text: q.question_text,
        question_hint: q.question_hint ?? null,
        question_type: q.question_type,
        min_chars_hint: q.min_chars_hint ?? null,
      });
      ids[i] = row.id;
    }
    for (const [i, q] of s.questions.entries()) {
      if (q.parent === undefined) continue;
      await insert("project_questions", {
        project_id: project.id,
        use_case_id: uc.id,
        position: i,
        question_text: q.question_text,
        question_hint: q.question_hint ?? null,
        question_type: q.question_type,
        min_chars_hint: q.min_chars_hint ?? null,
        parent_question_id: ids[q.parent],
        parent_show_when_values: q.when,
      });
    }
    console.log(`  + scénario ${order + 1} : ${s.title} (${s.criteria.length} critères, ${s.questions.length} questions)`);
  }

  // 4. Questions générales (hors scénario)
  await insert("project_questions", [
    {
      project_id: project.id,
      use_case_id: null,
      position: 0,
      question_text: "Recommanderiez-vous Kalvi à un autre indépendant ? Notez de 1 à 5.",
      question_hint: null,
      question_type: "scale_1_5",
      min_chars_hint: null,
    },
    {
      project_id: project.id,
      use_case_id: null,
      position: 1,
      question_text: "Si vous ne deviez changer qu'une seule chose dans Kalvi, laquelle ?",
      question_hint: "Une seule, la plus importante pour vous, et pourquoi.",
      question_type: "text",
      min_chars_hint: 80,
    },
  ]);
  console.log("  + 2 questions générales");

  // 5. NDA par défaut (même contenu que le bouton « Créer le NDA » du staff)
  const { defaultNdaHtml } = await import(pathToFileURL(join(ROOT, "src/lib/nda-pdf.ts")).href);
  await insert("project_ndas", {
    project_id: project.id,
    title: "Accord de confidentialité (NDA)",
    content_html: defaultNdaHtml(),
  });
  console.log("  + NDA par défaut");

  const appUrl = (env.NEXT_PUBLIC_APP_URL || "https://www.earlypanel.fr").replace(/\/$/, "");
  console.log(`\nProjet démo prêt : ${appUrl}/staff/dashboard/projects/${project.id}`);
}

// ---------------------------------------------------------------------
const args = new Set(process.argv.slice(2));
console.log(`Base : ${URL_BASE}\n`);
if (args.has("--delete")) {
  await deleteDemo();
} else if (args.has("--recreate")) {
  await deleteDemo();
  await createDemo();
} else {
  await createDemo();
}
