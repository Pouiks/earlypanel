// =====================================================================
// E2E — Campagne de disponibilité testeur (Slice 4).
//
//   node scripts/e2e/availability-campaign.mjs [--base-url=http://localhost:3009]
//   (ou : npm run e2e:availability)
//
// Déroule : campagne staff (email intercepté) → clic "Oui" (token) →
// available_until posé + reconnexion → clic "Non" (token) → landing profil →
// self-service (indisponible / désactiver / réactiver).
//
// PRÉREQUIS : migration 035 appliquée + ACTION_TOKEN_SECRET dans .env.local.
// Garde-fou SKIP_EMAILS identique aux autres scripts E2E.
// =====================================================================

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadEnv, CookieJar, makeHttp, makeSupabaseAdmin, makeActionToken, loginViaMagicLink,
  makeRunner, parseArgs, assertEq, assertTruthy,
} from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E2E_DOMAIN = "@e2e.earlypanel.test";
const STAFF_EMAIL = `staff-e2e${E2E_DOMAIN}`;

const args = parseArgs(process.argv);
const env = loadEnv(ROOT);
const baseUrl = args["base-url"] || process.env.E2E_BASE_URL || "http://localhost:3000";
const runId = Date.now().toString(36);

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && !args["allow-remote"]) {
  console.error(`✗ base-url non locale (${baseUrl}).`); process.exit(1);
}
if (env.SKIP_EMAILS !== "true") { console.error("✗ SKIP_EMAILS != true — refus."); process.exit(1); }
if (!env.STAFF_SETUP_KEY) { console.error("✗ STAFF_SETUP_KEY absent."); process.exit(1); }
if (!env.ACTION_TOKEN_SECRET) { console.error("✗ ACTION_TOKEN_SECRET absent de .env.local."); process.exit(1); }

const sb = makeSupabaseAdmin(env);
const staffJar = new CookieJar();
const testerJar = new CookieJar();
const asStaff = makeHttp(baseUrl, staffJar);
const asTester = makeHttp(baseUrl, testerJar);
const anon = makeHttp(baseUrl, null);
const run = makeRunner();
const ctx = {};

console.log(`\nE2E dispo — run ${runId}\n  App : ${baseUrl}\n`);

await run.step("Préflight : colonnes de dispo présentes (migration 035)", async () => {
  const rows = await sb.select("testers", "select=id,available_until,availability_check_sent_at&limit=1");
  return `migration OK (colonnes présentes)`;
  // (si la migration manque, sb.select jette avec un message clair)
});

await run.step("Seed : testeur actif via /api/admin/seed-demo", async () => {
  const { status, json } = await anon("POST", "/api/admin/seed-demo", { body: { setup_key: env.STAFF_SETUP_KEY } });
  if (status !== 200) throw new Error(`seed-demo → ${status} : ${JSON.stringify(json)}`);
  ctx.testerId = assertTruthy(json.tester?.id, "tester id");
  ctx.testerEmail = json.tester.email;
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=status,profile_completed`);
  assertEq(t?.status, "active", "testeur actif");
  assertEq(t?.profile_completed, true, "profil complet");
  return `testeur ${String(ctx.testerId).slice(0, 8)}… actif`;
});

await run.step("Staff : bootstrap + login", async () => {
  await anon("POST", "/api/staff/setup", {
    body: { email: STAFF_EMAIL, password: `E2e!${runId}${Math.random().toString(36).slice(2, 8)}`, setup_key: env.STAFF_SETUP_KEY },
  });
  await loginViaMagicLink(sb, asStaff, STAFF_EMAIL, "/staff/auth/callback");
  const { status } = await asStaff("GET", "/api/staff/clients");
  assertEq(status, 200, "session staff");
  return "staff connecté";
});

await run.step("Staff : envoi de la campagne (ciblée sur le testeur E2E, email intercepté)", async () => {
  // IMPORTANT : on scope au testeur E2E via tester_ids pour ne JAMAIS toucher
  // les testeurs réels (la campagne "à tous" reste testée par l'assertion sent=1
  // sur le sous-ensemble). Un run E2E ne doit pas marquer de vrais testeurs.
  const { status, json } = await asStaff("POST", "/api/staff/testers/availability-campaign", {
    body: { tester_ids: [ctx.testerId] },
  });
  assertEq(status, 200, `campagne (${JSON.stringify(json)})`);
  assertEq(json.sent, 1, "1 envoi (ciblé)");
  assertEq(json.total, 1, "1 destinataire ciblé");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=availability_check_sent_at`);
  assertTruthy(t?.availability_check_sent_at, "availability_check_sent_at posé");
  return `1/1 envoyé (ciblé E2E), idempotence tracée`;
});

await run.step("Testeur : clic 'Oui' (token) → dispo posée + reconnexion espace", async () => {
  const token = makeActionToken(env, ctx.testerId, "availability_confirm");
  const { status, response } = await asTester("GET", `/api/testers/availability?token=${encodeURIComponent(token)}`, { redirect: "manual" });
  assertEq(status >= 300 && status < 400, true, `302 attendu (obtenu ${status})`);
  const loc = response.headers.get("location") ?? "";
  assertTruthy(loc.includes("/app/auth/callback"), `callback dans Location (${loc})`);
  assertTruthy(loc.includes("availability%3Dconfirmed") || loc.includes("availability=confirmed"), "next=…availability=confirmed");
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=available_until,availability_responded_at`);
  assertTruthy(t?.available_until, "available_until posé");
  assertTruthy(new Date(t.available_until).getTime() > Date.now(), "fenêtre future");
  // Suivre le callback pour établir la session testeur (jar).
  const cb = await asTester("GET", loc.replace(baseUrl, ""), { redirect: "manual" });
  const dest = cb.response.headers.get("location") ?? "";
  assertTruthy(dest.includes("/app/dashboard"), `atterrissage dashboard (${dest})`);
  return "dispo confirmée + testeur reconnecté";
});

await run.step("Testeur : clic 'Non' (token) → landing profil, dispo inchangée", async () => {
  const [before] = await sb.select("testers", `id=eq.${ctx.testerId}&select=available_until`);
  const token = makeActionToken(env, ctx.testerId, "availability_manage");
  const { response } = await anon("GET", `/api/testers/availability?token=${encodeURIComponent(token)}`, { redirect: "manual" });
  const loc = response.headers.get("location") ?? "";
  assertTruthy(loc.includes("/app/auth/callback"), "callback");
  assertTruthy(loc.includes("profil") && loc.includes("disponibilite"), `next vers profil?section=disponibilite (${loc})`);
  const [after] = await sb.select("testers", `id=eq.${ctx.testerId}&select=available_until`);
  assertEq(after?.available_until, before?.available_until, "available_until inchangé (manage ne mute pas la dispo)");
  return "landing profil, aucune mutation de dispo";
});

await run.step("Testeur : self-service 'me rendre indisponible'", async () => {
  const { status, json } = await asTester("POST", "/api/testers/me/availability", { body: { action: "set_unavailable" } });
  assertEq(status, 200, `set_unavailable (${JSON.stringify(json)})`);
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=available_until,status`);
  assertEq(t?.available_until, null, "available_until remis à null");
  assertEq(t?.status, "active", "reste actif");
  return "indisponible, compte toujours actif";
});

await run.step("Testeur : self-service 'désactiver' → status inactive", async () => {
  const { status, json } = await asTester("POST", "/api/testers/me/availability", { body: { action: "deactivate" } });
  assertEq(status, 200, `deactivate (${JSON.stringify(json)})`);
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=status`);
  assertEq(t?.status, "inactive", "status inactive");
  return "compte désactivé (inactive)";
});

await run.step("Testeur : self-service 'réactiver' → status active", async () => {
  const { status, json } = await asTester("POST", "/api/testers/me/availability", { body: { action: "reactivate" } });
  assertEq(status, 200, `reactivate (${JSON.stringify(json)})`);
  const [t] = await sb.select("testers", `id=eq.${ctx.testerId}&select=status`);
  assertEq(t?.status, "active", "status active");
  return "compte réactivé";
});

run.summary();
console.log(`\n→ Nettoyage : npm run e2e:cleanup -- --base-url=${baseUrl}\n`);
