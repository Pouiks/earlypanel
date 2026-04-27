<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Source de vérité

Avant toute modification non triviale, lire **`PROJECT_CONTEXT.md`** :
- Section 9 (zones fragiles) et 10 (contrats implicites) → ce qui peut casser silencieusement
- Section 12 (checklist) → à parcourir avant tout PR
- Section 13 (playbook sécurité) → patterns d'auth, rate-limit, audit, RLS, crons

# Règles de sécurité non-négociables

Ces règles s'appliquent à **toute** modification touchant à l'auth, aux API, aux crons ou à la DB. Détails et exemples dans `PROJECT_CONTEXT.md` section 13.

## Auth des routes API

- **Staff** : `getStaffMember()` en première ligne. `null` → 401.
- **Tester** : `getAuthedTester()` en première ligne. `null` → 401.
- **Cron** : check `Authorization: Bearer ${CRON_SECRET}`. En prod, `CRON_SECRET` absent ⇒ 500 (fail-closed).
- **Service role** : `createAdminClient()` retourne `null` si pas configuré → 500. Toujours vérifier avant `.from(...)`.

## Données sensibles côté client

- `SUPABASE_SERVICE_ROLE_KEY` : **jamais** exposée côté client, **jamais** loguée.
- `STAFF_SETUP_KEY`, `CRON_SECRET`, `STRIPE_*_SECRET`, `RESEND_API_KEY` : `.env` only, jamais committés, jamais loggés.
- Pas de `console.log(process.env.X)` même en debug.

## Anti-énumération sur l'auth

Routes `/api/staff/login/magic`, `/api/staff/forgot`, `/api/staff/recover-owner`, `/api/testers/login`, `/api/testers/register` :

- Réponse `200` **systématique** que l'email existe ou non (sauf 400 pour format invalide).
- Pas de différence visible (statut, body, timing) entre "email connu" et "email inconnu".
- Génération du lien + envoi email **uniquement** si compte existe — mais l'API renvoie 200 dans tous les cas.

## Rate-limiting

Toute route prenant un email/identifiant utilisateur doit avoir un double rate-limit :
- **Par IP** : 5/min (anti-bot)
- **Par email** : 3/heure (anti-harcèlement d'un compte cible)

Helpers : `rateLimit()` + `getClientIp()` dans `src/lib/rate-limit.ts`. Rate-limiter **in-memory** (limite connue, cf. C15) — acceptable mais pas une vraie protection contre attaquant motivé.

## Audit log immuable

Pour toute action sensible (signature NDA, paiement, suppression, changement de rôle, recovery, invitation, opérations cron) :

```typescript
await logStaffAction(
  { staff_id, staff_email, action, entity_type, entity_id, metadata },
  request, // capture ip + user_agent
);
```

`staff_audit_log` est append-only (RLS `USING(false)`, pas d'UPDATE/DELETE). Ne jamais ajouter de chemin code qui modifie cette table. Le log de signature NDA (`nda.signed_by_tester`) sert de **preuve juridique** — son `metadata` (hash, IP, UA, identité, timestamps) ne doit jamais être réduit.

## RLS sur toutes les tables

Toute nouvelle table : `ENABLE ROW LEVEL SECURITY` + politiques explicites (`USING(false)` pour clients anon, accès via `service_role` uniquement). Pas d'exception.

## RPC SECURITY DEFINER

Toute fonction `SECURITY DEFINER` doit avoir :
```sql
ALTER FUNCTION ... SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ... TO service_role;
```
Cf. migration `023_lockdown_rpcs.sql` pour le pattern complet.

## Email-avant-DB sur routes critiques

Pour les routes qui envoient un email **et** changent un statut (`nda/send`, `testers/invite`, etc.) :
1. Envoyer l'email d'abord
2. Si succès → transition DB avec filtre atomique `.eq("status", "<previous>")` (anti-race + idempotent)
3. Si email échoue → retourner l'erreur sans toucher à la DB

Ne jamais inverser cet ordre.

## Idempotence des crons

Tout cron qui produit un side effect doit avoir une colonne d'idempotence :
- Cooldown (ex: `nda_reminder_sent_at < now() - 3j`)
- One-shot (ex: `project_midway_reminder_sent_at IS NULL`)
- Transition mono-directionnelle (ex: `active → closed`, pas de retour)

`UPDATE` de la colonne d'idempotence **après** l'envoi réussi, dans la même boucle. Sans ça, un cron qui retourne 2× spamme les utilisateurs.

## Bucket `documents` privé

Le bucket Supabase `documents` (NDA signés, données personnelles) doit toujours être en `public: false`. `ensureDocumentsBucketPrivate()` force cet état à chaque signature. Les paths sont stockés en DB sous `storage:<path>` et résolus en URLs signées 1h à la volée. Ne jamais y stocker une URL publique.

## Webhooks externes

Tout webhook (Stripe, Yousign, …) :
1. Body en raw, pas de JSON parsing avant signature check
2. Vérification signature via secret dédié
3. Idempotence par event ID (cf. RPC `record_stripe_event` pour le pattern)

## Avant de PR

Checklist sécurité (section 12 de `PROJECT_CONTEXT.md`) :
- [ ] Toute nouvelle route API a son check d'auth
- [ ] Toute route avec email a son rate-limit IP + email
- [ ] Routes auth/recovery retournent `200` systématique (anti-énumération)
- [ ] Tout nouveau cron a son `Bearer CRON_SECRET` + guard d'idempotence
- [ ] Toute action sensible a son `logStaffAction(...)`
- [ ] Toute nouvelle table a `ENABLE ROW LEVEL SECURITY` + policies
- [ ] Toute nouvelle RPC `SECURITY DEFINER` a `search_path` + `REVOKE FROM PUBLIC`
