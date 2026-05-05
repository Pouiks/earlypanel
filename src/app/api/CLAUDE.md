# Règles pour `src/app/api/*`

Toute route API doit respecter ces 7 règles. Référence : `PROJECT_CONTEXT.md` section 13.

## 1. Auth en première ligne

```typescript
// Staff
export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... suite
}

// Tester
const tester = await getAuthedTester();
if (!tester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Cron
const auth = request.headers.get("authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Routes publiques autorisées** (whitelist explicite — toute exception doit être ajoutée ici ET justifiée) :

- `/api/health` — healthcheck
- `/api/lead-magnet` — formulaire public
- `/api/internal/ping-indexnow` — interne (pas exposé publiquement)
- `/api/webhooks/stripe` — auth via signature, pas via cookie

## 2. Anti-énumération sur les routes auth

Routes : `/api/staff/login/magic`, `/api/staff/forgot`, `/api/staff/recover-owner`, `/api/testers/login`, `/api/testers/register`.

- **200 systématique** que l'email existe ou non (sauf 400 pour format invalide).
- **Pas de différence visible** : status, body, et timing identiques.
- Génération du lien + envoi email **uniquement si compte existe**, mais l'API renvoie 200 dans tous les cas.

## 3. Rate-limit double IP + email

```typescript
const ip = getClientIp(request);
const ipLimit = rateLimit(`ip:${ip}:${routeName}`, { windowMs: 60_000, max: 5 });
if (!ipLimit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

const emailLimit = rateLimit(`email:${email}:${routeName}`, { windowMs: 3_600_000, max: 3 });
if (!emailLimit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
```

## 4. Audit log immuable pour actions sensibles

Toute action sensible (signature NDA, paiement, suppression, changement de rôle, recovery, invitation) :

```typescript
await logStaffAction(
  { staff_id, staff_email, action, entity_type, entity_id, metadata },
  request, // capture IP + user-agent
);
```

`staff_audit_log` est append-only (`USING(false)`, pas d'UPDATE/DELETE). Ne **jamais** ajouter de chemin code qui modifie cette table.

## 5. Email-avant-DB (anti-race + idempotent)

Pour les routes qui envoient un email **et** changent un statut (`nda/send`, `testers/invite`, etc.) :

1. Envoyer l'email **d'abord**
2. Si succès → transition DB avec filtre atomique `.eq("status", "<previous>")` (anti-race)
3. Si email échoue → retourner l'erreur sans toucher à la DB

**Ne jamais inverser cet ordre.**

## 6. Service role : check + null safety

```typescript
const admin = createAdminClient();
if (!admin) {
  return NextResponse.json({ error: "Server config missing" }, { status: 500 });
}
const { data, error } = await admin.from("...").select();
```

`createAdminClient()` retourne `null` si `SUPABASE_SERVICE_ROLE_KEY` est absent (fail-closed).

## 7. Données sensibles : jamais logguées, jamais retournées

- ❌ `console.log({ iban })`, même en debug → un IBAN clair ne doit JAMAIS apparaître dans Vercel logs.
- ❌ Retourner `tester.iban_encrypted` côté client.
- ✅ Retourner `iban_last4` ou `iban_masked` (`XXXX XXXX XXXX 1234`).
- ❌ Logguer `process.env.SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*_SECRET`, `RESEND_API_KEY`, `IBAN_ENCRYPTION_KEY`, `CRON_SECRET`, `STAFF_SETUP_KEY`.

## Edge Runtime vs Node.js

- Edge : routes simples sans `node:crypto`, sans `pdf-lib`, sans `nodemailer`. Plus rapide.
- Node : tout le reste (chiffrement, PDF, signature webhooks).

Annoter explicitement :
```typescript
export const runtime = "edge"; // ou "nodejs" (par défaut)
```

## Tests

- Tests unitaires : helpers `lib/` consommés par les routes.
- Tests d'intégration (à venir, Playwright) : parcours auth, rate-limit, anti-énumération.
- Smoke post-deploy : POST IBAN, login, export CSV.

## Checklist avant PR

- [ ] Auth check en première ligne (staff / tester / cron / signature)
- [ ] Rate-limit IP + email sur routes auth
- [ ] Anti-énumération : 200 systématique sur recovery/login
- [ ] Audit log sur toute action sensible
- [ ] Email-avant-DB respecté
- [ ] Pas de log de données sensibles
- [ ] `tests/unit/<helper>.test.ts` couvre les helpers utilisés
