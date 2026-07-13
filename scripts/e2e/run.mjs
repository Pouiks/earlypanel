// =====================================================================
// Workflow E2E — creation d'un projet autonome de bout en bout.
//
//   node scripts/e2e/run.mjs [--base-url=http://localhost:3000]
//   (ou : npm run e2e:run)
//
// Deroule le parcours complet via les VRAIES routes API de l'app :
//   staff setup → login staff → client B2B → projet → scenario
//   (use case + criteres + questions typees) → NDA → inscription
//   testeur (register) → onboarding 5 etapes → activation → assignation
//   → envoi NDA (email intercepte) → signature NDA → start mission →
//   reponses → submit → completions criteres → notation staff →
//   payout → tentative paiement (sans Stripe) → paiement montant 0.
//
// Chaque etape est verifiee (statuts, scores, montants). Exit 1 au
// premier echec. Toutes les donnees sont taggees pour la suppression
// cascade en une commande : node scripts/e2e/cleanup.mjs
//
// GARDE-FOU ABSOLU : refuse de tourner si SKIP_EMAILS != "true" dans
// .env.local — les 66+ testeurs de la DB sont des personnes reelles,
// aucun email ne doit jamais partir depuis un run E2E.
// =====================================================================

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadEnv, CookieJar, makeHttp, makeSupabaseAdmin, loginViaMagicLink,
  makeRunner, parseArgs, assertEq, assertTruthy,
} from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E2E_DOMAIN = "@e2e.earlypanel.test";
const PROJECT_PREFIX = "[E2E TEST]";
const STAFF_EMAIL = `staff-e2e${E2E_DOMAIN}`;

const args = parseArgs(process.argv);
const env = loadEnv(ROOT);
const baseUrl = args["base-url"] || process.env.E2E_BASE_URL || "http://localhost:3000";
const runId = Date.now().toString(36);
const testerEmail = `e2e-tester-${runId}${E2E_DOMAIN}`;
// --name=X personnalise le nom du projet ; le prefixe [E2E TEST] reste
// impose : c'est le tag sur lequel repose la suppression cascade.
const projectName = typeof args.name === "string" && args.name.trim() ? args.name.trim() : `Parcours complet ${runId}`;
const projectTitle = `${PROJECT_PREFIX} ${projectName}`;

// --- Garde-fous avant toute action -----------------------------------
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && !args["allow-remote"]) {
  console.error(`✗ base-url non locale (${baseUrl}). Passez --allow-remote si c'est voulu.`);
  process.exit(1);
}
if (env.SKIP_EMAILS !== "true" && process.env.E2E_ALLOW_REAL_EMAILS !== "1") {
  console.error("✗ SKIP_EMAILS n'est pas a 'true' dans .env.local.");
  console.error("  La DB contient des testeurs REELS : un run E2E sans interception");
  console.error("  d'emails leur enverrait de vrais mails. Ajoutez SKIP_EMAILS=true");
  console.error("  dans .env.local et redemarrez le serveur dev.");
  process.exit(1);
}
const setupKey = env.STAFF_SETUP_KEY;
if (!setupKey) {
  console.error("✗ STAFF_SETUP_KEY absent de .env.local");
  process.exit(1);
}

const sb = makeSupabaseAdmin(env);
const staffJar = new CookieJar();
const testerJar = new CookieJar();
const asStaff = makeHttp(baseUrl, staffJar);
const asTester = makeHttp(baseUrl, testerJar);
const anon = makeHttp(baseUrl, null);
const run = makeRunner();

console.log(`\nE2E earlypanel — run ${runId}`);
console.log(`  App     : ${baseUrl}`);
console.log(`  Testeur : ${testerEmail}`);
console.log(`  Projet  : ${projectTitle}\n`);

// Contexte partage entre les etapes
const ctx = {};

// --- 0. Preflight ------------------------------------------------------
await run.step("Preflight : /api/health repond et Supabase est joignable", async () => {
  const { status, json } = await anon("GET", "/api/health");
  if (!json || typeof json !== "object" || !json.checks) {
    throw new Error(`/api/health ne repond pas en JSON (HTTP ${status}) — mauvais serveur sur ${baseUrl} ?`);
  }
  assertTruthy(json.checks.supabase?.ok, "check supabase du health");
  return `status=${json.status}, supabase ok (${json.checks.supabase.latency_ms ?? "?"}ms)`;
});

// --- 1. Staff E2E ------------------------------------------------------
await run.step("Staff : bootstrap du compte E2E via /api/staff/setup (dev only)", async () => {
  const password = `E2e!${runId}${Math.random().toString(36).slice(2, 10)}`;
  const { status, json } = await anon("POST", "/api/staff/setup", {
    body: {
      email: STAFF_EMAIL,
      password,
      first_name: "Staff",
      last_name: "E2E",
      setup_key: setupKey,
    },
  });
  if (status !== 201 && status !== 200) {
    throw new Error(`setup → HTTP ${status} : ${JSON.stringify(json)}`);
  }
  return status === 201 ? "compte staff cree" : "compte staff existant reutilise";
});

await run.step("Staff : login par magic link (callback /staff/auth/callback)", async () => {
  const location = await loginViaMagicLink(sb, asStaff, STAFF_EMAIL, "/staff/auth/callback");
  const { status } = await asStaff("GET", "/api/staff/clients");
  assertEq(status, 200, "GET /api/staff/clients apres login");
  return `session ok, redirect → ${location}`;
});

// --- 2. Client B2B -----------------------------------------------------
await run.step("Client B2B : creation via POST /api/staff/clients", async () => {
  const { status, json } = await asStaff("POST", "/api/staff/clients", {
    body: {
      company_name: `${PROJECT_PREFIX} Client Acme ${runId}`,
      sector: "SaaS B2B",
      website: "https://acme.example",
      contact_first_name: "Jean",
      contact_last_name: "Moulin",
      contact_email: `contact-client-${runId}${E2E_DOMAIN}`,
      notes: "Client fictif cree par scripts/e2e/run.mjs",
    },
  });
  assertEq(status, 201, `POST clients (body: ${JSON.stringify(json)})`);
  ctx.clientId = assertTruthy(json.id, "id du client");
  return `client ${ctx.clientId.slice(0, 8)}…`;
});

// --- 3. Projet ---------------------------------------------------------
await run.step("Projet : creation en draft via POST /api/staff/projects", async () => {
  const today = new Date();
  const end = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
  const { status, json } = await asStaff("POST", "/api/staff/projects", {
    body: {
      title: projectTitle,
      description: "Projet E2E automatise — supprimable via scripts/e2e/cleanup.mjs",
      company_name: `${PROJECT_PREFIX} Client Acme ${runId}`,
      client_id: ctx.clientId,
      start_date: today.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      base_reward_cents: 2000,
      urls: ["https://demo.acme.example"],
      business_objective: "Valider le parcours d'inscription avant lancement.",
      scope_included: ["Inscription", "Onboarding"],
      test_type: "unmoderated",
    },
  });
  assertEq(status, 201, `POST projects (body: ${JSON.stringify(json)})`);
  ctx.projectId = assertTruthy(json.id, "id du projet");
  assertEq(json.status, "draft", "statut initial du projet");
  return `${json.ref_number ?? "?"} — ${ctx.projectId.slice(0, 8)}…`;
});

// --- 4. Scenario (use case + criteres + questions) ----------------------
await run.step("Scénario : use case + 2 critères + 3 questions typées", async () => {
  const { status, json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/use-cases`, {
    body: {
      title: "S'inscrire et compléter son profil",
      task_wording:
        "Vous découvrez le produit Acme. Créez un compte, complétez votre profil et notez ce qui vous a gêné.",
      order: 0,
      expected_testers_count: 1,
      criteria: [
        { label: "J'ai réussi à créer mon compte", is_primary: true },
        { label: "Le parcours m'a semblé fluide", is_primary: false },
      ],
      questions: [
        {
          question_text: "Décrivez votre première impression en 2-3 phrases.",
          question_type: "text",
          question_hint: "Ce qui vous a plu, ce qui vous a bloqué, le temps passé.",
        },
        { question_text: "Avez-vous réussi à créer votre compte ?", question_type: "binary" },
        { question_text: "Notez la fluidité du parcours de 1 à 5.", question_type: "scale_1_5" },
      ],
    },
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`POST use-cases → HTTP ${status} : ${JSON.stringify(json)}`);
  }

  // Recharge pour recuperer les ids questions/criteres
  const list = await asStaff("GET", `/api/staff/projects/${ctx.projectId}/use-cases`);
  const ucs = Array.isArray(list.json) ? list.json : list.json?.use_cases ?? [];
  const uc = assertTruthy(ucs[0], "use case recharge");
  ctx.useCaseId = uc.id;
  ctx.criteria = uc.criteria ?? [];
  ctx.questions = uc.questions ?? [];
  assertEq(ctx.criteria.length, 2, "nombre de criteres");
  assertEq(ctx.questions.length, 3, "nombre de questions");
  return `use case ${String(ctx.useCaseId).slice(0, 8)}…, ${ctx.questions.length} questions`;
});

// --- 5. NDA ------------------------------------------------------------
await run.step("NDA : upsert du template par défaut via POST /nda", async () => {
  const { status, json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/nda`, {
    body: { title: `${PROJECT_PREFIX} Accord de confidentialité` },
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`POST nda → HTTP ${status} : ${JSON.stringify(json)}`);
  }
  return "NDA configuré";
});

// --- 6. Testeur : inscription réelle (landing) ---------------------------
await run.step("Testeur : inscription via POST /api/testers/register (emails interceptés)", async () => {
  const { status, json } = await anon("POST", "/api/testers/register", {
    body: { email: testerEmail, first_name: "Camille", last_name: "Fabre" },
  });
  if (status === 429) {
    throw new Error("rate limit register atteint (5/h par IP) — attendez ou changez d'IP");
  }
  assertEq(status, 200, `register (body: ${JSON.stringify(json)})`);
  const rows = await sb.select("testers", `email=eq.${encodeURIComponent(testerEmail)}&select=id,status,profile_completed`);
  const t = assertTruthy(rows[0], "ligne testers creee");
  ctx.testerId = t.id;
  assertEq(t.status, "pending", "statut testeur post-register");
  return `tester ${ctx.testerId.slice(0, 8)}… en pending`;
});

await run.step("Testeur : login magic link (callback /app/auth/callback)", async () => {
  const location = await loginViaMagicLink(sb, asTester, testerEmail, "/app/auth/callback");
  if (!location.includes("/app/onboarding")) {
    throw new Error(`redirect attendu vers /app/onboarding, obtenu : ${location}`);
  }
  return "session testeur ok → onboarding";
});

// --- 7. Onboarding 5 étapes ---------------------------------------------
await run.step("Onboarding : 5 étapes PATCH → activation automatique (trigger DB)", async () => {
  const steps = [
    [1, {
      first_name: "Camille", last_name: "Fabre", phone: "+33612345678",
      birth_date: "1992-05-14", address: "12 rue des Lilas", city: "Lyon", postal_code: "69003",
    }],
    [2, { job_title: "Product Manager", sector: "Tech / SaaS", company_size: "11-50", digital_level: "avance" }],
    [3, { tools: ["Notion", "Slack", "Figma"] }],
    [4, { browsers: ["Chrome", "Firefox"], devices: ["PC Windows", "iPhone"], connection: "Fibre" }],
    [5, { availability: "3-5", ux_experience: "Quelquefois", interests: ["SaaS B2B", "E-commerce"] }],
  ];
  for (const [step, data] of steps) {
    const { status, json } = await asTester("PATCH", "/api/testers/onboarding/step", { body: { step, data } });
    if (status !== 200) throw new Error(`step ${step} → HTTP ${status} : ${JSON.stringify(json)}`);
    if (step === 5 && json.profile_completed !== true) {
      throw new Error(`step 5 : profil non complet (${JSON.stringify(json)})`);
    }
  }
  const rows = await sb.select("testers", `id=eq.${ctx.testerId}&select=status,profile_completed,quality_score,tier`);
  assertEq(rows[0]?.status, "active", "statut testeur post-onboarding");
  assertEq(rows[0]?.profile_completed, true, "profile_completed");
  assertEq(rows[0]?.quality_score, 100, "score initial");
  return "testeur actif, profil complet, score 100";
});

// --- 8. Assignation + envoi NDA -----------------------------------------
await run.step("Staff : assignation du testeur (POST /testers → selected)", async () => {
  const { status, json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/testers`, {
    body: { tester_ids: [ctx.testerId] },
  });
  assertEq(status, 201, `assignation (body: ${JSON.stringify(json)})`);
  const pts = await asStaff("GET", `/api/staff/projects/${ctx.projectId}/testers`);
  const list = Array.isArray(pts.json) ? pts.json : pts.json?.testers ?? pts.json?.data ?? [];
  const pt = assertTruthy(list.find((r) => r.tester_id === ctx.testerId), "ligne project_testers");
  ctx.projectTesterId = pt.id;
  assertEq(pt.status, "selected", "statut project_tester");
  return `project_tester ${String(ctx.projectTesterId).slice(0, 8)}… en selected`;
});

await run.step("Staff : envoi NDA (email intercepté, projet draft → active)", async () => {
  const { status, json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/nda/send`, {
    body: { tester_ids: [ctx.testerId] },
  });
  assertEq(status, 200, `nda/send (body: ${JSON.stringify(json)})`);
  assertEq(json.sent, 1, "nombre de NDA envoyes");
  const [project] = await sb.select("projects", `id=eq.${ctx.projectId}&select=status`);
  assertEq(project?.status, "active", "statut projet apres envoi NDA");
  const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,nda_sent_at`);
  assertEq(pt?.status, "nda_sent", "statut project_tester");
  assertTruthy(pt?.nda_sent_at, "nda_sent_at");
  return "projet actif, NDA envoyé (aucun vrai mail : SKIP_EMAILS)";
});

// --- 9. Signature NDA + mission ------------------------------------------
await run.step("Testeur : signature du NDA (PDF + hash + audit)", async () => {
  const docs = await asTester("GET", "/api/testers/documents");
  const docList = Array.isArray(docs.json) ? docs.json : docs.json?.documents ?? [];
  assertTruthy(docList.length > 0, "NDA visible cote testeur");
  const { status, json } = await asTester("POST", `/api/testers/documents/${ctx.projectId}/sign`, { body: {} });
  assertEq(status, 200, `sign (body: ${JSON.stringify(json)})`);
  assertTruthy(json.document_hash, "hash SHA-256 du PDF");
  const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,nda_document_hash`);
  assertEq(pt?.status, "nda_signed", "statut project_tester");
  return `NDA signé, hash ${String(json.document_hash).slice(0, 12)}…`;
});

await run.step("Testeur : démarrage mission (nda_signed → in_progress)", async () => {
  const { status, json } = await asTester("POST", `/api/testers/missions/${ctx.projectId}/start`, { body: {} });
  assertEq(status, 200, `start (body: ${JSON.stringify(json)})`);
  const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,started_at`);
  assertEq(pt?.status, "in_progress", "statut project_tester");
  return "mission démarrée";
});

await run.step("Testeur : réponses aux 3 questions (text / binary / scale)", async () => {
  const answersByType = {
    text: "Première impression très positive : le parcours est clair, je n'ai été bloquée nulle part. Environ 4 minutes au total.",
    binary: "yes",
    scale_1_5: "4",
  };
  for (const q of ctx.questions) {
    const answer_text = answersByType[q.question_type] ?? answersByType.text;
    const { status, json } = await asTester("PUT", `/api/testers/missions/${ctx.projectId}/answers`, {
      body: { question_id: q.id, answer_text },
    });
    if (status !== 200) throw new Error(`answer q=${q.id} → HTTP ${status} : ${JSON.stringify(json)}`);
  }
  return `${ctx.questions.length} réponses enregistrées`;
});

await run.step("Testeur : soumission mission (→ completed, event score +5)", async () => {
  const { status, json } = await asTester("POST", `/api/testers/missions/${ctx.projectId}/submit`, { body: {} });
  assertEq(status, 200, `submit (body: ${JSON.stringify(json)})`);
  const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,submitted_at`);
  assertEq(pt?.status, "completed", "statut project_tester");
  // Le trigger recalculate_tester_tier borne le score a 100 : pour un
  // testeur neuf (deja a 100), le +5 est plafonne. On verifie donc
  // l'EVENEMENT de score (la trace), pas l'increment.
  const events = await sb.select("tester_score_events", `tester_id=eq.${ctx.testerId}&select=delta&order=created_at.asc`);
  assertEq(events.some((e) => e.delta === 5), true, "event score +5 present");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=quality_score`);
  assertEq(t?.quality_score, 100, "score plafonne a 100 (trigger)");
  return "mission soumise, event +5 tracé, score plafonné à 100";
});

// --- 10. Complétions critères + notation + payout -------------------------
await run.step("Staff : complétion des critères de succès (PUT /completions)", async () => {
  const completions = ctx.criteria.map((c) => ({
    project_tester_id: ctx.projectTesterId,
    use_case_id: ctx.useCaseId,
    criterion_id: c.id,
    passed: true,
  }));
  const { status, json } = await asStaff("PUT", `/api/staff/projects/${ctx.projectId}/completions`, {
    body: { completions },
  });
  assertEq(status, 200, `completions (body: ${JSON.stringify(json)})`);
  const rows = await sb.select("use_case_completions", `project_tester_id=eq.${ctx.projectTesterId}&select=id,passed`);
  assertEq(rows.length, 2, "lignes use_case_completions");
  return "2 critères cochés (dont le primaire)";
});

await run.step("Staff : notation 4★ (event +10, payout 2200 = 2000 × 1.1)", async () => {
  const { status, json } = await asStaff("PATCH", `/api/staff/projects/${ctx.projectId}/answers`, {
    body: { project_tester_id: ctx.projectTesterId, rating: 4, note: "Réponses détaillées et exploitables. [E2E]" },
  });
  assertEq(status, 200, `rating (body: ${JSON.stringify(json)})`);
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=quality_score,missions_completed`);
  assertEq(t?.quality_score, 100, "score plafonne a 100 (trigger)");
  assertEq(t?.missions_completed, 1, "missions_completed");
  const payouts = await asStaff("GET", `/api/staff/projects/${ctx.projectId}/payouts`);
  const list = payouts.json?.payouts ?? [];
  const payout = assertTruthy(list.find((p) => p.project_tester_id === ctx.projectTesterId), "ligne payout");
  ctx.payoutId = payout.id;
  assertEq(payout.calculated_amount_cents, 2200, "montant calcule");
  assertEq(payout.final_amount_cents, 2200, "montant final");
  assertEq(payout.status, "pending", "statut payout");
  return "event +10 tracé, payout pending 22,00 €";
});

await run.step("Paiement : 0 € → REFUS (jamais 'payé' sans montant)", async () => {
  // Fiabilisation : un versement a 0 € ne doit jamais devenir 'paid'.
  const patch = await asStaff("PATCH", `/api/staff/projects/${ctx.projectId}/payouts`, {
    body: { payout_id: ctx.payoutId, final_amount_cents: 0 },
  });
  assertEq(patch.status, 200, `override 0€ (body: ${JSON.stringify(patch.json)})`);
  const { json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/pay`, {
    body: { payout_ids: [ctx.payoutId] },
  });
  assertEq(json.results?.[0]?.ok, false, `0€ doit etre refuse (body: ${JSON.stringify(json)})`);
  assertTruthy(String(json.results?.[0]?.error).includes("Aucun montant"), "message 'aucun montant'");
  const [p] = await sb.select("tester_payouts", `id=eq.${ctx.payoutId}&select=status,paid_at`);
  assertEq(p?.status, "pending", "0€ reste pending, PAS paid");
  assertEq(p?.paid_at, null, "0€ n'a pas de paid_at");
  return "0 € refusé — statut reste pending, aucun 'payé' fantôme";
});

await run.step("Paiement : montant rétabli, sans destination → REFUS (jamais 'payé' sans coordonnées)", async () => {
  // Remet le montant réel puis tente de payer un testeur SANS destination.
  await asStaff("PATCH", `/api/staff/projects/${ctx.projectId}/payouts`, {
    body: { payout_id: ctx.payoutId, final_amount_cents: 2200 },
  });
  const { json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/pay`, {
    body: { payout_ids: [ctx.payoutId] },
  });
  assertEq(json.results?.[0]?.ok, false, `sans destination doit etre refuse (body: ${JSON.stringify(json)})`);
  assertTruthy(String(json.results?.[0]?.error).includes("Coordonnées"), "message 'coordonnées manquantes'");
  const [p] = await sb.select("tester_payouts", `id=eq.${ctx.payoutId}&select=status,paid_at`);
  assertEq(p?.status, "pending", "sans destination reste pending");
  assertEq(p?.paid_at, null, "sans destination n'a pas de paid_at");
  return "sans coordonnées → refusé, aucun 'payé' sans moyen de paiement";
});

await run.step("Paiement : destination OK → transfert initié = 'en cours' (PAS encore payé)", async () => {
  // On dote le testeur d'un compte Stripe (fictif). Sans STRIPE_SECRET_KEY,
  // la route initie un transfert SIMULÉ et laisse le versement 'en cours'.
  await sb.update("testers", `id=eq.${ctx.testerId}`, { stripe_account_id: "acct_e2e_sim" });
  const { json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/pay`, {
    body: { payout_ids: [ctx.payoutId] },
  });
  const r = assertTruthy(json.results?.[0], "resultat pay");
  assertEq(r.ok, true, `initiation ok (body: ${JSON.stringify(json)})`);
  assertEq(r.status, "processing", "statut retourné = processing");
  const [p] = await sb.select("tester_payouts", `id=eq.${ctx.payoutId}&select=status,paid_at,stripe_transfer_id`);
  assertEq(p?.status, "pending", "en cours = pending (pas encore paid)");
  assertEq(p?.paid_at, null, "pas de paid_at tant que non confirmé");
  assertTruthy(p?.stripe_transfer_id, "transfer_id posé (transfert initié)");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=total_earned`);
  assertEq(Number(t?.total_earned), 0, "total_earned PAS encore crédité");
  return `transfert initié (${p.stripe_transfer_id}) — en cours, non payé, non crédité`;
});

await run.step("Paiement : retour Stripe simulé 'paid' → payé + total_earned crédité", async () => {
  const { status, json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/simulate-stripe`, {
    body: { payout_id: ctx.payoutId, outcome: "paid" },
  });
  assertEq(status, 200, `simulate paid (body: ${JSON.stringify(json)})`);
  const [p] = await sb.select("tester_payouts", `id=eq.${ctx.payoutId}&select=status,paid_at`);
  assertEq(p?.status, "paid", "statut payout = paid après confirmation");
  assertTruthy(p?.paid_at, "paid_at renseigné");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=total_earned`);
  assertEq(Number(t?.total_earned), 22, "total_earned crédité de 22,00 €");
  const ledger = await sb.select("tester_earnings_ledger", `payout_id=eq.${ctx.payoutId}&select=amount_euros`);
  assertEq(ledger.length, 1, "1 seule entrée ledger (crédit unique)");
  return "payé après confirmation, 22 € crédités, ledger idempotent";
});

await run.step("Paiement : idempotence — re-simuler 'paid' ne recrédite pas", async () => {
  await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/simulate-stripe`, {
    body: { payout_id: ctx.payoutId, outcome: "paid" },
  });
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=total_earned`);
  assertEq(Number(t?.total_earned), 22, "total_earned toujours 22 (pas de double crédit)");
  const ledger = await sb.select("tester_earnings_ledger", `payout_id=eq.${ctx.payoutId}&select=amount_euros`);
  assertEq(ledger.length, 1, "toujours 1 entrée ledger");
  return "double confirmation absorbée — aucun double crédit";
});

await run.step("Paiement : reversal simulé → failed + crédit annulé", async () => {
  const { json } = await asStaff("POST", `/api/staff/projects/${ctx.projectId}/payouts/simulate-stripe`, {
    body: { payout_id: ctx.payoutId, outcome: "reversed" },
  });
  assertTruthy(json.success, `reversal (body: ${JSON.stringify(json)})`);
  const [p] = await sb.select("tester_payouts", `id=eq.${ctx.payoutId}&select=status`);
  assertEq(p?.status, "failed", "reversal → failed");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=total_earned`);
  assertEq(Number(t?.total_earned), 0, "crédit annulé (total_earned revenu à 0)");
  return "reversal → failed, total_earned ramené à 0";
});

// --- 11. Audit log + score events ------------------------------------------
await run.step("Audit : présence des actions sensibles dans staff_audit_log", async () => {
  const expected = [
    "project_tester.assigned", "nda.sent", "nda.signed_by_tester",
    "mission.started", "mission.submitted", "project_tester.rated", "payout.created",
  ];
  const rows = await sb.select(
    "staff_audit_log",
    `select=action,metadata&order=created_at.desc&limit=200`
  );
  const actions = new Set(rows.map((r) => r.action));
  const missing = expected.filter((a) => !actions.has(a));
  if (missing.length > 0) {
    run.warn(`actions absentes de l'audit log : ${missing.join(", ")}`);
  }
  const events = await sb.select(
    "tester_score_events",
    `tester_id=eq.${ctx.testerId}&select=delta,reason&order=created_at.asc`
  );
  const deltas = events.map((e) => e.delta).join(",");
  assertEq(deltas, "5,10", "deltas de score (submit +5, rating +10)");
  return `${expected.length - missing.length}/${expected.length} actions auditées, deltas score OK`;
});

// --- Fin ---------------------------------------------------------------
run.summary();
console.log(`
Données créées (toutes taggées, suppression cascade en une commande) :
  Projet   : ${projectTitle}
  Client   : ${PROJECT_PREFIX} Client Acme ${runId}
  Testeur  : ${testerEmail}
  Staff    : ${STAFF_EMAIL} (réutilisé entre les runs)

→ Nettoyage : npm run e2e:cleanup ${baseUrl !== "http://localhost:3000" ? `-- --base-url=${baseUrl}` : ""}
`);
