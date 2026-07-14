// =====================================================================
// Bibliotheque partagee des scripts E2E (run.mjs / cleanup.mjs).
// Zero dependance externe : Node >= 18.17 (fetch natif + getSetCookie).
// =====================================================================

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHmac } from "node:crypto";

// Recalcule un token d'action signé (le harness ne lit pas les emails — il
// reconstruit le token comme il reconstruit déjà les magic links via REST).
// Doit rester aligné sur src/lib/action-token.ts.
export function makeActionToken(env, tid, act, ttlSec = 90 * 86400) {
  const secret = env.ACTION_TOKEN_SECRET;
  if (!secret) throw new Error("ACTION_TOKEN_SECRET manquant dans .env.local");
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = Buffer.from(JSON.stringify({ tid, act, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

// ---------------------------------------------------------------------
// Chargement .env / .env.local (le .env.local prime, comme Next.js)
// ---------------------------------------------------------------------
export function loadEnv(rootDir) {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    const p = join(rootDir, file);
    if (!existsSync(p)) continue;
    for (const rawLine of readFileSync(p, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return env;
}

// ---------------------------------------------------------------------
// Cookie jar minimal (suffisant pour les cookies sb-* de Supabase SSR)
// ---------------------------------------------------------------------
export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const [pair, ...attrs] = sc.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const maxAgeAttr = attrs.find((a) => a.trim().toLowerCase().startsWith("max-age="));
      const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : null;
      if (value === "" || maxAge === 0) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

// ---------------------------------------------------------------------
// Client HTTP vers l'app Next locale, avec jar optionnel
// ---------------------------------------------------------------------
export function makeHttp(baseUrl, jar) {
  return async function request(method, path, { body, headers = {}, redirect = "follow" } = {}) {
    const h = { ...headers };
    if (body !== undefined) h["Content-Type"] = "application/json";
    if (jar && jar.header()) h["Cookie"] = jar.header();

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect,
    });
    if (jar) jar.absorb(response);

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // reponse non-JSON (page HTML, redirect...) : json reste null
    }
    return { status: response.status, json, text, response };
  };
}

// ---------------------------------------------------------------------
// Helpers Supabase admin (service_role) — REST PostgREST + GoTrue admin
// ---------------------------------------------------------------------
export function makeSupabaseAdmin(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  return {
    // SELECT : sb.select("testers", "email=eq.x&select=id,status")
    async select(table, query) {
      const r = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
      if (!r.ok) throw new Error(`REST select ${table} → ${r.status} ${await r.text()}`);
      return r.json();
    },

    // UPDATE (PATCH) : sb.update("testers", "id=eq.x", { field: val })
    async update(table, query, patch) {
      const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`REST update ${table} → ${r.status} ${await r.text()}`);
      return true;
    },

    // DELETE avec retour des lignes supprimees
    async delete(table, query) {
      const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
        method: "DELETE",
        headers: { ...headers, Prefer: "return=representation" },
      });
      if (!r.ok) throw new Error(`REST delete ${table} → ${r.status} ${await r.text()}`);
      return r.json();
    },

    // Genere un magic link sans envoyer d'email (admin GoTrue).
    // Retourne le token_hash a passer au callback local.
    async generateMagicLinkToken(email) {
      const r = await fetch(`${url}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", email }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(`generate_link(${email}) → ${r.status} ${JSON.stringify(json)}`);
      const token = json.hashed_token ?? json.properties?.hashed_token;
      if (!token) throw new Error(`generate_link(${email}) : hashed_token absent de la reponse`);
      return token;
    },

    async deleteAuthUser(userId) {
      const r = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });
      return r.ok;
    },

    // Storage : liste les objets d'un prefixe puis supprime
    async storageList(bucket, prefix) {
      const r = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
      });
      if (!r.ok) return [];
      return r.json();
    },

    async storageDelete(bucket, paths) {
      if (paths.length === 0) return true;
      const r = await fetch(`${url}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: paths }),
      });
      return r.ok;
    },
  };
}

// ---------------------------------------------------------------------
// Login par magic link : generate_link (admin) → GET callback local →
// capture des cookies de session dans le jar.
// ---------------------------------------------------------------------
export async function loginViaMagicLink(sb, http, email, callbackPath) {
  const token = await sb.generateMagicLinkToken(email);
  const { status, response } = await http(
    "GET",
    `${callbackPath}?token_hash=${encodeURIComponent(token)}&type=magiclink`,
    { redirect: "manual" }
  );
  const location = response.headers.get("location") ?? "";
  if (status < 300 || status >= 400 || location.includes("error")) {
    throw new Error(`Login ${email} via ${callbackPath} → HTTP ${status}, redirect: ${location}`);
  }
  return location;
}

// ---------------------------------------------------------------------
// Seed cote staff via les vraies routes API : staff E2E + client B2B +
// projet + scenario (use case / criteres / questions) + NDA.
// Retourne { staffHttp, clientId, projectId, useCaseId, criteria, questions }.
// Utilise par user-journey.mjs (le run.mjs garde ses etapes detaillees).
// ---------------------------------------------------------------------
export async function seedProjectViaStaffApi({ env, baseUrl, sb, projectTitle, staffEmail, runId }) {
  const jar = new CookieJar();
  const staffHttp = makeHttp(baseUrl, jar);
  const anon = makeHttp(baseUrl, null);

  // 1. Bootstrap staff (idempotent en dev : promeut si existant)
  const setup = await anon("POST", "/api/staff/setup", {
    body: {
      email: staffEmail,
      password: `E2e!${runId}${Math.random().toString(36).slice(2, 10)}`,
      first_name: "Staff",
      last_name: "E2E",
      setup_key: env.STAFF_SETUP_KEY,
    },
  });
  if (setup.status !== 200 && setup.status !== 201) {
    throw new Error(`staff/setup → HTTP ${setup.status} : ${setup.text}`);
  }

  // 2. Login magic link
  await loginViaMagicLink(sb, staffHttp, staffEmail, "/staff/auth/callback");

  // 3. Client B2B
  const client = await staffHttp("POST", "/api/staff/clients", {
    body: {
      company_name: `${projectTitle.split("]")[0]}] Client Acme ${runId}`,
      sector: "SaaS B2B",
      contact_first_name: "Jean",
      contact_last_name: "Moulin",
      contact_email: `contact-client-${runId}@e2e.earlypanel.test`,
    },
  });
  if (client.status !== 201) throw new Error(`POST clients → ${client.status} : ${client.text}`);

  // 4. Projet
  const today = new Date();
  const end = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
  const project = await staffHttp("POST", "/api/staff/projects", {
    body: {
      title: projectTitle,
      description: "Projet E2E (parcours utilisateur UI) — supprimable via scripts/e2e/cleanup.mjs",
      company_name: `Client Acme ${runId}`,
      client_id: client.json.id,
      start_date: today.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      base_reward_cents: 2000,
      urls: ["https://demo.acme.example"],
      test_type: "unmoderated",
    },
  });
  if (project.status !== 201) throw new Error(`POST projects → ${project.status} : ${project.text}`);

  // 5. Scenario : use case + criteres + questions typees
  const uc = await staffHttp("POST", `/api/staff/projects/${project.json.id}/use-cases`, {
    body: {
      title: "S'inscrire et compléter son profil",
      task_wording: "Vous découvrez le produit Acme. Créez un compte et notez ce qui vous a gêné.",
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
          question_hint: "Ce qui vous a plu, ce qui vous a bloqué.",
        },
        { question_text: "Avez-vous réussi à créer votre compte ?", question_type: "binary" },
        { question_text: "Notez la fluidité du parcours de 1 à 5.", question_type: "scale_1_5" },
      ],
    },
  });
  if (uc.status !== 200 && uc.status !== 201) throw new Error(`POST use-cases → ${uc.status} : ${uc.text}`);

  // 6. NDA
  const nda = await staffHttp("POST", `/api/staff/projects/${project.json.id}/nda`, {
    body: { title: "[E2E TEST] Accord de confidentialité" },
  });
  if (nda.status !== 200 && nda.status !== 201) throw new Error(`POST nda → ${nda.status} : ${nda.text}`);

  // Recharge le use case pour les ids questions/criteres
  const list = await staffHttp("GET", `/api/staff/projects/${project.json.id}/use-cases`);
  const ucs = Array.isArray(list.json) ? list.json : list.json?.use_cases ?? [];

  return {
    staffHttp,
    clientId: client.json.id,
    projectId: project.json.id,
    refNumber: project.json.ref_number,
    useCaseId: ucs[0]?.id,
    criteria: ucs[0]?.criteria ?? [],
    questions: ucs[0]?.questions ?? [],
  };
}

// ---------------------------------------------------------------------
// Mini-runner de steps avec resume final
// ---------------------------------------------------------------------
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function makeRunner({ onFail = "exit" } = {}) {
  const results = [];
  let stepIndex = 0;

  return {
    async step(name, fn) {
      stepIndex += 1;
      const label = `${String(stepIndex).padStart(2, "0")}. ${name}`;
      process.stdout.write(`${DIM}▸ ${label}...${RESET}\n`);
      const startedAt = Date.now();
      try {
        const detail = await fn();
        const ms = Date.now() - startedAt;
        results.push({ label, ok: true, detail, ms });
        console.log(`${GREEN}  ✓ PASS${RESET} ${detail ? `${DIM}— ${detail}${RESET}` : ""} ${DIM}(${ms}ms)${RESET}`);
      } catch (err) {
        const ms = Date.now() - startedAt;
        results.push({ label, ok: false, detail: err.message, ms });
        console.log(`${RED}  ✗ FAIL — ${err.message}${RESET}`);
        if (onFail === "exit") {
          this.summary();
          process.exit(1);
        }
        // onFail === "throw" : laisse l'appelant fermer proprement
        // (navigateur, captures) avant de sortir.
        throw err;
      }
    },

    warn(msg) {
      console.log(`${YELLOW}  ⚠ ${msg}${RESET}`);
    },

    summary() {
      const pass = results.filter((r) => r.ok).length;
      const fail = results.length - pass;
      console.log("\n──────────────────────────────────────────────");
      console.log(`Résultat : ${GREEN}${pass} PASS${RESET}${fail ? ` / ${RED}${fail} FAIL${RESET}` : ""} sur ${results.length} étapes`);
      for (const r of results) {
        console.log(` ${r.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`} ${r.label}${r.detail ? ` ${DIM}— ${r.detail}${RESET}` : ""}`);
      }
    },
  };
}

// ---------------------------------------------------------------------
// Parsing des arguments CLI (--base-url=..., --flag)
// ---------------------------------------------------------------------
export function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq === -1) args[a.slice(2)] = true;
      else args[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      args._.push(a);
    }
  }
  return args;
}

export function assertEq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what} : attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

export function assertTruthy(value, what) {
  if (!value) throw new Error(`${what} : valeur vide/absente`);
  return value;
}
