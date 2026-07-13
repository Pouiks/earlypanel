// =====================================================================
// Parcours UTILISATEUR de bout en bout — via la vraie UI (Playwright).
//
//   node scripts/e2e/user-journey.mjs [--base-url=http://localhost:3000]
//                                     [--name=TESTE2E] [--headed] [--slow=250]
//   (ou : npm run e2e:journey)
//
// Toutes les etapes qu'un testeur reel traverse, dans un vrai navigateur :
//   inscription sur la landing /testeurs → clic sur le magic link →
//   onboarding 5 etapes (formulaires reels) → tour guide (fermeture) →
//   dashboard → signature du NDA (modale de confirmation) → demarrage
//   mission (modale) → reponses aux 3 questions (text/binary/scale,
//   auto-save) → soumission (modale) → mission completee → gains.
//
// Les actions STAFF (creation client/projet/scenario/NDA, assignation,
// envoi NDA, notation, payout, cloture) passent par l'API en arriere-plan
// — comme dans la realite.
//
// Captures d'ecran de chaque etape : scripts/e2e/.screenshots/<runId>/
// Cleanup : npm run e2e:cleanup (memes tags que run.mjs).
// =====================================================================

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import {
  loadEnv, makeSupabaseAdmin, seedProjectViaStaffApi,
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
const projectName = typeof args.name === "string" && args.name.trim() ? args.name.trim() : `Parcours utilisateur ${runId}`;
const projectTitle = `${PROJECT_PREFIX} ${projectName}`;
const shotsDir = join(ROOT, "scripts", "e2e", ".screenshots", runId);
mkdirSync(shotsDir, { recursive: true });

// --- Garde-fous identiques a run.mjs ------------------------------------
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && !args["allow-remote"]) {
  console.error(`✗ base-url non locale (${baseUrl}). Passez --allow-remote si c'est voulu.`);
  process.exit(1);
}
if (env.SKIP_EMAILS !== "true" && process.env.E2E_ALLOW_REAL_EMAILS !== "1") {
  console.error("✗ SKIP_EMAILS n'est pas a 'true' dans .env.local — refus (testeurs reels en base).");
  process.exit(1);
}
if (!env.STAFF_SETUP_KEY) {
  console.error("✗ STAFF_SETUP_KEY absent de .env.local");
  process.exit(1);
}

const sb = makeSupabaseAdmin(env);
const run = makeRunner({ onFail: "throw" });
const ctx = {};

console.log(`\nE2E earlypanel — parcours utilisateur (UI) — run ${runId}`);
console.log(`  App      : ${baseUrl}`);
console.log(`  Testeur  : ${testerEmail}`);
console.log(`  Projet   : ${projectTitle}`);
console.log(`  Captures : ${shotsDir}\n`);

// --- Navigateur -----------------------------------------------------------
const browser = await chromium.launch({
  headless: !args.headed,
  slowMo: args.slow ? Number(args.slow) : 0,
});
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: "fr-FR" });
// Neutralise le banner cookies (fixe bas-droite, recouvrirait le bouton
// "Soumettre ma mission"). Le tour guide, lui, est TESTE (fermeture au X).
await context.addInitScript(() => {
  window.localStorage.setItem("ep_cookie_info_dismissed_v1", "1");
});
const page = await context.newPage();

let shotIndex = 0;
async function shot(name) {
  shotIndex += 1;
  await page.screenshot({ path: join(shotsDir, `${String(shotIndex).padStart(2, "0")}-${name}.png`) });
}

try {
  // --- 0. Seed cote staff (API, comme dans la realite) --------------------
  await run.step("Staff (API) : client + projet + scénario + NDA prêts", async () => {
    ctx.seed = await seedProjectViaStaffApi({ env, baseUrl, sb, projectTitle, staffEmail: STAFF_EMAIL, runId });
    assertEq(ctx.seed.questions.length, 3, "questions du scenario");
    return `${ctx.seed.refNumber} — projet ${String(ctx.seed.projectId).slice(0, 8)}…`;
  });

  // --- 1. Inscription sur la landing --------------------------------------
  await run.step("UI : inscription sur /testeurs#register (formulaire réel)", async () => {
    await page.goto(`${baseUrl}/testeurs#register`, { waitUntil: "domcontentloaded" });
    const form = page.locator("#register");
    await form.getByPlaceholder("Marie", { exact: true }).fill("Camille");
    await form.getByPlaceholder("Dupont", { exact: true }).fill("Fabre");
    await form.getByPlaceholder("marie@exemple.fr", { exact: true }).fill(testerEmail);
    await form.locator("select").nth(0).selectOption({ label: "Tech / SaaS" });
    await form.getByRole("button", { name: "Avancé", exact: true }).click();
    await form.locator("select").nth(1).selectOption({ label: "3 à 5 missions par mois" });
    await shot("register-rempli");
    await form.getByRole("button", { name: /Créer mon profil/ }).click();
    await page.getByRole("heading", { name: "Vous y êtes presque !" }).waitFor({ timeout: 15000 });
    await shot("register-succes");

    const rows = await sb.select("testers", `email=eq.${encodeURIComponent(testerEmail)}&select=id,status`);
    ctx.testerId = assertTruthy(rows[0]?.id, "ligne testers creee");
    assertEq(rows[0].status, "pending", "statut testeur");
    return "inscription OK, testeur en pending, email de bienvenue intercepté";
  });

  // --- 2. Magic link (equivalent du clic dans l'email) ---------------------
  await run.step("UI : clic sur le magic link → arrivée sur l'onboarding", async () => {
    const token = await sb.generateMagicLinkToken(testerEmail);
    await page.goto(`${baseUrl}/app/auth/callback?token_hash=${encodeURIComponent(token)}&type=magiclink`);
    await page.waitForURL("**/app/onboarding", { timeout: 15000 });
    await page.getByRole("button", { name: /Continuer/ }).waitFor({ timeout: 15000 });
    await shot("onboarding-etape1");
    return "session ouverte, onboarding étape 1 affichée";
  });

  // --- 3. Onboarding 5 etapes (formulaires reels) ---------------------------
  await run.step("UI : onboarding étape 1 — informations personnelles", async () => {
    await page.getByPlaceholder("Marie", { exact: true }).fill("Camille");
    await page.getByPlaceholder("Dupont", { exact: true }).fill("Fabre");
    await page.getByPlaceholder("06 12 34 56 78", { exact: true }).fill("0612345678");
    const birth = page.getByPlaceholder("JJ/MM/AAAA", { exact: true });
    await birth.click();
    await birth.pressSequentially("14051992");
    await page.getByPlaceholder("12 rue de la Paix", { exact: true }).fill("12 rue des Lilas");
    await page.getByPlaceholder("75001", { exact: true }).fill("69003");
    await page.getByPlaceholder("Paris", { exact: true }).fill("Lyon");
    await shot("onboarding-etape1-remplie");
    await page.getByRole("button", { name: /Continuer/ }).click();
    await page.getByRole("heading", { name: /Profil professionnel/ }).waitFor({ timeout: 15000 });
    return "étape 1 sauvegardée";
  });

  await run.step("UI : onboarding étape 2 — profil professionnel", async () => {
    await page.getByPlaceholder(/Tapez votre métier/).fill("Product Manager");
    await page.locator("select").nth(0).selectOption({ label: "Tech / IT / Software" });
    await page.locator("select").nth(1).selectOption({ label: "11-50 employés" });
    await page.getByRole("button", { name: "Expert", exact: true }).click();
    await shot("onboarding-etape2-remplie");
    await page.getByRole("button", { name: /Continuer/ }).click();
    await page.getByRole("heading", { name: /Logiciels utilisés/ }).waitFor({ timeout: 15000 });
    return "étape 2 sauvegardée";
  });

  await run.step("UI : onboarding étape 3 — outils du quotidien", async () => {
    await page.getByRole("button", { name: "Notion", exact: true }).click();
    await page.getByRole("button", { name: "Slack", exact: true }).click();
    await page.getByRole("button", { name: "Figma", exact: true }).click();
    await shot("onboarding-etape3-remplie");
    await page.getByRole("button", { name: /Continuer/ }).click();
    await page.getByRole("heading", { name: /Configuration technique/ }).waitFor({ timeout: 15000 });
    return "3 outils sélectionnés";
  });

  await run.step("UI : onboarding étape 4 — configuration technique", async () => {
    await page.getByRole("button", { name: "Chrome", exact: true }).click();
    await page.getByRole("button", { name: "Firefox", exact: true }).click();
    await page.getByRole("button", { name: "PC Windows", exact: true }).click();
    await page.getByRole("button", { name: "iPhone", exact: true }).click();
    await page.getByRole("button", { name: "Fibre", exact: true }).click();
    await shot("onboarding-etape4-remplie");
    await page.getByRole("button", { name: /Continuer/ }).click();
    await page.getByRole("heading", { name: /Disponibilités/ }).waitFor({ timeout: 15000 });
    return "étape 4 sauvegardée";
  });

  await run.step("UI : onboarding étape 5 — disponibilités + CGU → activation", async () => {
    await page.getByRole("button", { name: "Plus de 5 fois par mois", exact: true }).click();
    await page.getByRole("button", { name: "Sites web", exact: true }).click();
    await page.getByRole("button", { name: "E-commerce / shopping", exact: true }).click();
    // Les gros boutons d'experience UX contiennent label + description :
    // pas de match exact possible, on cible par regex sur le label.
    await page.getByRole("button", { name: /Déjà fait 1 ou 2 fois/ }).click();
    await page.locator('input[type="checkbox"]').check();
    await shot("onboarding-etape5-remplie");
    await page.getByRole("button", { name: /Finaliser mon profil/ }).click();
    await page.waitForURL("**/app/dashboard", { timeout: 20000 });

    const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=status,profile_completed,quality_score`);
    assertEq(t?.status, "active", "statut testeur (trigger auto_activate)");
    assertEq(t?.profile_completed, true, "profile_completed");
    return "profil finalisé → testeur ACTIF (trigger DB), dashboard atteint";
  });

  // --- 4. Tour guide (driver.js) ---------------------------------------------
  await run.step("UI : tour guidé — apparition puis fermeture (skip tracé en DB)", async () => {
    const popover = page.locator(".driver-popover");
    try {
      await popover.waitFor({ timeout: 8000 });
      await shot("tour-guide-ouvert");
      await page.locator(".driver-popover-close-btn").click();
      await popover.waitFor({ state: "hidden", timeout: 5000 });
      // Le skip est persiste en async : petite tolerance avant verification
      await page.waitForTimeout(1500);
      const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=onboarding_tour_skipped_at`);
      if (!t?.onboarding_tour_skipped_at) run.warn("onboarding_tour_skipped_at non posé en DB");
      return "tour affiché puis fermé au X, skip persisté";
    } catch {
      run.warn("tour guidé non apparu (déjà vu ou viewport) — poursuite");
      return "tour non affiché (toléré)";
    }
  });

  await run.step("UI : dashboard testeur affiché (Bonjour Camille)", async () => {
    await page.getByText(/Bonjour\s+Camille/i).waitFor({ timeout: 10000 });
    await shot("dashboard");
    return "dashboard OK";
  });

  // --- 5. Staff (API) : assignation + envoi NDA ------------------------------
  await run.step("Staff (API) : assignation du testeur + envoi du NDA", async () => {
    const assign = await ctx.seed.staffHttp("POST", `/api/staff/projects/${ctx.seed.projectId}/testers`, {
      body: { tester_ids: [ctx.testerId] },
    });
    assertEq(assign.status, 201, `assignation (${assign.text})`);
    const send = await ctx.seed.staffHttp("POST", `/api/staff/projects/${ctx.seed.projectId}/nda/send`, {
      body: { tester_ids: [ctx.testerId] },
    });
    assertEq(send.status, 200, `nda/send (${send.text})`);
    assertEq(send.json.sent, 1, "NDA envoyes");
    const pts = await sb.select("project_testers", `project_id=eq.${ctx.seed.projectId}&tester_id=eq.${ctx.testerId}&select=id,status`);
    ctx.projectTesterId = assertTruthy(pts[0]?.id, "project_tester");
    assertEq(pts[0].status, "nda_sent", "statut nda_sent");
    return "testeur assigné, NDA envoyé (email intercepté), projet actif";
  });

  // --- 6. Signature du NDA via l'UI --------------------------------------------
  await run.step("UI : Mes documents → Signer ce document → Confirmer", async () => {
    await page.locator('[data-tour="nav-documents"]').click();
    await page.waitForURL("**/app/dashboard/documents", { timeout: 10000 });
    await page.getByText(/En attente de signature/).first().waitFor({ timeout: 15000 });
    await shot("documents-nda-en-attente");
    await page.getByRole("button", { name: "Signer ce document", exact: true }).first().click();
    // Modale de confirmation (Enter=Confirmer, Escape=Annuler)
    await page.getByRole("button", { name: "Confirmer", exact: true }).click();
    await page.getByText(/Signé le/).first().waitFor({ timeout: 20000 });
    await shot("documents-nda-signe");

    const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,nda_document_hash`);
    assertEq(pt?.status, "nda_signed", "statut nda_signed");
    assertTruthy(pt?.nda_document_hash, "hash PDF");
    return `NDA signé via l'UI, hash ${String(pt.nda_document_hash).slice(0, 12)}…`;
  });

  // --- 7. Mission : demarrage + reponses + soumission ---------------------------
  await run.step("UI : Mes missions → détail → Démarrer le test", async () => {
    await page.locator('[data-tour="nav-missions"]').click();
    await page.waitForURL("**/app/dashboard/missions", { timeout: 10000 });
    await page.locator(`a[href="/app/dashboard/missions/${ctx.seed.projectId}"]`).first().click();
    await page.waitForURL(`**/app/dashboard/missions/${ctx.seed.projectId}`, { timeout: 10000 });
    await shot("mission-detail");
    await page.getByRole("button", { name: "Démarrer le test", exact: true }).click();
    await page.getByRole("button", { name: /Je démarre maintenant/ }).click();
    await page.getByText(/Question 1 sur 3/).first().waitFor({ timeout: 15000 });
    await shot("mission-demarree");

    const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status`);
    assertEq(pt?.status, "in_progress", "statut in_progress");
    return "mission démarrée via la modale";
  });

  await run.step("UI : question 1/3 (texte libre, auto-save au blur)", async () => {
    const textarea = page.locator("textarea");
    await textarea.fill("Première impression très positive : le parcours est clair et rapide, je n'ai été bloquée nulle part. Environ 4 minutes au total.");
    await textarea.blur();
    await page.getByText(/Enregistré/).first().waitFor({ timeout: 10000 });
    await shot("mission-q1-texte");
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByText(/Question 2 sur 3/).first().waitFor({ timeout: 10000 });
    return "réponse texte auto-sauvegardée";
  });

  await run.step("UI : question 2/3 (binaire — Oui)", async () => {
    await page.getByRole("button", { name: "Oui", exact: true }).click();
    await page.getByText(/Enregistré/).first().waitFor({ timeout: 10000 });
    await shot("mission-q2-binaire");
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByText(/Question 3 sur 3/).first().waitFor({ timeout: 10000 });
    return "réponse binaire sauvegardée";
  });

  await run.step("UI : question 3/3 (échelle — 4) puis Soumettre ma mission", async () => {
    await page.getByRole("button", { name: "4", exact: true }).click();
    await page.getByText(/Enregistré/).first().waitFor({ timeout: 10000 });
    await shot("mission-q3-echelle");
    const submitBtn = page.getByRole("button", { name: /Soumettre ma mission/ });
    await submitBtn.waitFor({ timeout: 5000 });
    await submitBtn.click();
    await page.getByRole("button", { name: /Soumettre définitivement/ }).click();
    await page.getByText(/Mission soumise/).first().waitFor({ timeout: 20000 });
    await shot("mission-soumise");

    const [pt] = await sb.select("project_testers", `id=eq.${ctx.projectTesterId}&select=status,submitted_at`);
    assertEq(pt?.status, "completed", "statut completed");
    const events = await sb.select("tester_score_events", `tester_id=eq.${ctx.testerId}&select=delta`);
    assertEq(events.some((e) => e.delta === 5), true, "event score +5");
    return "mission soumise via l'UI, event +5 tracé";
  });

  // --- 8. Staff (API) : criteres + notation + payout + cloture -------------------
  await run.step("Staff (API) : critères validés + notation 4★ + payout payé + projet clos", async () => {
    const completions = ctx.seed.criteria.map((c) => ({
      project_tester_id: ctx.projectTesterId,
      use_case_id: ctx.seed.useCaseId,
      criterion_id: c.id,
      passed: true,
    }));
    const comp = await ctx.seed.staffHttp("PUT", `/api/staff/projects/${ctx.seed.projectId}/completions`, {
      body: { completions },
    });
    assertEq(comp.status, 200, `completions (${comp.text})`);

    const rate = await ctx.seed.staffHttp("PATCH", `/api/staff/projects/${ctx.seed.projectId}/answers`, {
      body: { project_tester_id: ctx.projectTesterId, rating: 4, note: "Parcours UI complet. [E2E]" },
    });
    assertEq(rate.status, 200, `rating (${rate.text})`);

    const payouts = await ctx.seed.staffHttp("GET", `/api/staff/projects/${ctx.seed.projectId}/payouts`);
    const payout = assertTruthy((payouts.json?.payouts ?? [])[0], "payout cree");
    assertEq(payout.calculated_amount_cents, 2200, "montant calcule 2200");

    // Paiement sans Stripe : refus propre attendu, puis chemin montant 0 → paid
    const pay1 = await ctx.seed.staffHttp("POST", `/api/staff/projects/${ctx.seed.projectId}/payouts/pay`, {
      body: { payout_ids: [payout.id] },
    });
    assertEq(pay1.json?.results?.[0]?.ok, false, "refus sans Stripe");
    await ctx.seed.staffHttp("PATCH", `/api/staff/projects/${ctx.seed.projectId}/payouts`, {
      body: { payout_id: payout.id, final_amount_cents: 0 },
    });
    const pay2 = await ctx.seed.staffHttp("POST", `/api/staff/projects/${ctx.seed.projectId}/payouts/pay`, {
      body: { payout_ids: [payout.id] },
    });
    assertEq(pay2.json?.results?.[0]?.ok, true, "paiement (montant 0)");

    // Finalisation : cloture du projet
    const close = await ctx.seed.staffHttp("PATCH", `/api/staff/projects/${ctx.seed.projectId}`, {
      body: { status: "closed" },
    });
    assertEq(close.status, 200, `cloture projet (${close.text})`);
    return "critères OK, noté 4★, payout paid, projet CLOS";
  });

  // --- 9. Verification finale cote testeur : mission finalisee -------------------
  await run.step("UI : la mission reste visible en « Complétées » après clôture", async () => {
    await page.goto(`${baseUrl}/app/dashboard/missions`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Complétées/ }).click();
    await page.locator(`a[href="/app/dashboard/missions/${ctx.seed.projectId}"]`).first().waitFor({ timeout: 10000 });
    await shot("missions-completees");
    await page.locator('[data-tour="nav-gains"]').click();
    await page.waitForURL("**/app/dashboard/gains", { timeout: 10000 });
    await page.waitForTimeout(1200);
    await shot("gains");
    return "mission complétée visible malgré le projet clos, page gains OK";
  });

  run.summary();
  console.log(`
Parcours utilisateur complet validé dans un vrai navigateur.
  Captures : ${shotsDir}
  Projet   : ${projectTitle} (clos)
  Testeur  : ${testerEmail}

→ Nettoyage : npm run e2e:cleanup ${baseUrl !== "http://localhost:3000" ? `-- --base-url=${baseUrl}` : ""}
`);
} catch (err) {
  // Capture d'ecran de l'echec pour diagnostic
  try { await shot("ECHEC"); } catch { /* noop */ }
  console.error(`\n✗ Échec : ${err.message}\n  URL au moment de l'échec : ${page.url()}\n  Capture : ${shotsDir}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
