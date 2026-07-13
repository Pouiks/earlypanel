// =====================================================================
// Suppression cascade des donnees E2E — une seule commande.
//
//   node scripts/e2e/cleanup.mjs [--base-url=http://localhost:3000]
//   (ou : npm run e2e:cleanup)
//
// Supprime, dans l'ordre :
//   1. Les fichiers storage des projets E2E (PDF NDA, images mission)
//   2. Les projets '[E2E TEST]%' + testeurs '@e2e.earlypanel.test'
//      via POST /api/admin/cleanup-demo (CASCADE DB + auth.users) —
//      fallback en suppression REST directe si le serveur est down
//   3. Les clients B2B '[E2E TEST]%'
//   4. Le staff E2E (staff_members + auth.users)
// Puis verifie qu'il ne reste RIEN (exit 1 sinon).
//
// Ce qui reste volontairement : les entrees staff_audit_log (append-only,
// preuve immuable par design — cf. PROJECT_CONTEXT.md C18).
// =====================================================================

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv, makeSupabaseAdmin, makeHttp, parseArgs } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E2E_DOMAIN = "@e2e.earlypanel.test";
const PROJECT_PREFIX = "[E2E TEST]";

const args = parseArgs(process.argv);
const env = loadEnv(ROOT);
const baseUrl = args["base-url"] || process.env.E2E_BASE_URL || "http://localhost:3000";
const sb = makeSupabaseAdmin(env);
const anon = makeHttp(baseUrl, null);

// PostgREST : motif LIKE — * = wildcard. Les crochets sont litteraux.
const PROJECT_LIKE = encodeURIComponent(`${PROJECT_PREFIX}*`);
const EMAIL_LIKE = encodeURIComponent(`*${E2E_DOMAIN}`);

console.log(`\nCleanup E2E earlypanel — cible ${baseUrl}\n`);

// --- 1. Inventaire avant suppression -----------------------------------
const projects = await sb.select("projects", `title=like.${PROJECT_LIKE}&select=id,title`);
const testers = await sb.select("testers", `email=like.${EMAIL_LIKE}&select=id,email,auth_user_id`);
const clients = await sb.select("b2b_clients", `company_name=like.${PROJECT_LIKE}&select=id,company_name`);
const staff = await sb.select("staff_members", `email=like.${EMAIL_LIKE}&select=id,email,auth_user_id`);

console.log(`Inventaire : ${projects.length} projet(s), ${testers.length} testeur(s), ${clients.length} client(s), ${staff.length} staff E2E`);
if (projects.length + testers.length + clients.length + staff.length === 0) {
  console.log("Rien à nettoyer. ✓");
  process.exit(0);
}

// --- 2. Storage (avant la suppression des projets, on a besoin des ids) --
let deletedFiles = 0;
for (const p of projects) {
  // PDF NDA signes : bucket prive "documents", prefixe ndas/<projectId>/
  const ndaFiles = await sb.storageList("documents", `ndas/${p.id}`);
  const ndaPaths = ndaFiles.filter((f) => f.name).map((f) => `ndas/${p.id}/${f.name}`);
  if (ndaPaths.length && (await sb.storageDelete("documents", ndaPaths))) deletedFiles += ndaPaths.length;

  // Images mission : bucket "mission-images", prefixe <projectId>/<testerId>/<questionId>/
  // (arborescence a 3 niveaux : on descend recursivement)
  const level1 = await sb.storageList("mission-images", p.id);
  for (const d1 of level1) {
    const level2 = await sb.storageList("mission-images", `${p.id}/${d1.name}`);
    for (const d2 of level2) {
      const files = await sb.storageList("mission-images", `${p.id}/${d1.name}/${d2.name}`);
      const paths = files.filter((f) => f.name).map((f) => `${p.id}/${d1.name}/${d2.name}/${f.name}`);
      if (paths.length && (await sb.storageDelete("mission-images", paths))) deletedFiles += paths.length;
    }
  }
}
console.log(`Storage : ${deletedFiles} fichier(s) supprimé(s)`);

// --- 3. Projets + testeurs via la route admin (audit loggé) --------------
let routeOk = false;
if (env.STAFF_SETUP_KEY) {
  try {
    const { status, json } = await anon("POST", "/api/admin/cleanup-demo", {
      body: { setup_key: env.STAFF_SETUP_KEY },
    });
    if (status === 200 && json?.success) {
      routeOk = true;
      console.log(`Route cleanup-demo : ${json.deleted.projects} projet(s), ${json.deleted.testers} testeur(s), ${json.deleted.auth_users} auth user(s)`);
    } else {
      console.warn(`Route cleanup-demo → HTTP ${status} (${JSON.stringify(json)}), fallback REST direct`);
    }
  } catch (err) {
    console.warn(`Serveur injoignable (${err.message}), fallback REST direct`);
  }
}

if (!routeOk) {
  // Fallback : suppression directe service_role (CASCADE DB identique)
  const delProjects = await sb.delete("projects", `title=like.${PROJECT_LIKE}`);
  const delTesters = await sb.delete("testers", `email=like.${EMAIL_LIKE}`);
  let delAuth = 0;
  const staffAuthIds = new Set(staff.map((s) => s.auth_user_id));
  for (const t of testers) {
    if (t.auth_user_id && !staffAuthIds.has(t.auth_user_id)) {
      if (await sb.deleteAuthUser(t.auth_user_id)) delAuth += 1;
    }
  }
  console.log(`REST direct : ${delProjects.length} projet(s), ${delTesters.length} testeur(s), ${delAuth} auth user(s)`);
}

// --- 4. Clients B2B -------------------------------------------------------
const delClients = await sb.delete("b2b_clients", `company_name=like.${PROJECT_LIKE}`);
console.log(`Clients B2B : ${delClients.length} supprimé(s)`);

// --- 5. Staff E2E ----------------------------------------------------------
let delStaff = 0;
for (const s of staff) {
  await sb.delete("staff_members", `id=eq.${s.id}`);
  if (s.auth_user_id) await sb.deleteAuthUser(s.auth_user_id);
  delStaff += 1;
}
console.log(`Staff E2E : ${delStaff} supprimé(s)`);

// --- 6. Vérification finale — zéro reste ----------------------------------
const left = {
  projects: (await sb.select("projects", `title=like.${PROJECT_LIKE}&select=id`)).length,
  testers: (await sb.select("testers", `email=like.${EMAIL_LIKE}&select=id`)).length,
  clients: (await sb.select("b2b_clients", `company_name=like.${PROJECT_LIKE}&select=id`)).length,
  staff: (await sb.select("staff_members", `email=like.${EMAIL_LIKE}&select=id`)).length,
};
const leftovers = Object.entries(left).filter(([, n]) => n > 0);

if (leftovers.length > 0) {
  console.error(`\n✗ Restes détectés : ${leftovers.map(([k, n]) => `${k}=${n}`).join(", ")}`);
  process.exit(1);
}
console.log("\n✓ Cleanup complet — zéro donnée E2E restante.");
console.log("  (Les entrées staff_audit_log restent : append-only par design.)");
