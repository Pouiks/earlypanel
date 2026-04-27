# PROJECT_CONTEXT.md — earlypanel

> **Ce fichier est la source de vérité pour tout agent ou développeur.**
> Toute modification du projet DOIT être cohérente avec les règles documentées ici.
> En cas de doute, lire le code source référencé — ne jamais supposer.
>
> Dernière mise à jour : 2026-04-27 (ajout Phase 1 auth + automation NDA + crons relance + section 13 Playbook Sécurité + migration 026 profil strict + lib profile-completeness)

---

## 1. ARCHITECTURE

### Stack technique

| Couche | Technologie | Version exacte |
|--------|-------------|----------------|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.2.4 |
| CSS | Tailwind CSS v4 (`@tailwindcss/postcss`) | ^4 |
| BDD + Auth + Storage | Supabase (`@supabase/supabase-js` + `@supabase/ssr`) | 2.103 / 0.10.2 |
| Email | Resend | ^6.12 |
| Paiements | Stripe Connect (transfers) | ^22 |
| PDF | pdf-lib | ^1.17 |
| Rich Text | TipTap (starter-kit, link, underline, placeholder) | ^3.22 |
| Analytics | Matomo (cookieless, script inline dans root layout) | — |
| Déploiement | Vercel (cron via `vercel.json`) | — |

### Points d'entrée

| Route | Rôle | Protection |
|-------|------|-----------|
| `/` | Landing générale | Public |
| `/testeurs` | Landing B2C (acquisition testeurs) | Public |
| `/entreprises` | Landing B2B (acquisition clients) | Public |
| `/app/login` | Connexion testeur (magic link) | Public |
| `/app/onboarding` | Onboarding testeur 5 étapes | Session + profil incomplet |
| `/app/dashboard/*` | Dashboard testeur | Session + profil complet |
| `/staff/login` | Connexion staff (password ou magic link) | Public |
| `/staff/forgot` | Demande de reset password staff | Public |
| `/staff/reset` | Définition d'un nouveau password (post-recovery) | Session staff |
| `/staff/auth/callback` | Route handler PKCE/OTP staff | Public |
| `/staff/auth/error` | Page d'erreur auth staff | Public |
| `/staff/dashboard/*` | Dashboard admin/staff | Session + rôle staff/admin |
| `/api/*` | Route handlers | Varié (voir section dédiée) |

### Commandes

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run start    # next start
npm run lint     # eslint
```

### Variables d'environnement

```
# Supabase (OBLIGATOIRES en prod)
NEXT_PUBLIC_SUPABASE_URL          # URL du projet Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Clé anon (client-side, RLS)
SUPABASE_SERVICE_ROLE_KEY         # Clé service role (bypass RLS, server-only)

# Stripe (OBLIGATOIRES pour paiements)
STRIPE_SECRET_KEY                 # Clé secrète Stripe
STRIPE_WEBHOOK_SECRET             # Secret pour vérifier les webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # (non utilisé dans le code actuel)

# Email (OBLIGATOIRE pour envoi réel)
RESEND_API_KEY                    # Clé API Resend
RESEND_FROM_EMAIL                 # Adresse expéditeur (défaut: "earlypanel <noreply@earlypanel.fr>")

# App
NEXT_PUBLIC_APP_URL               # URL base de l'app (défaut: http://localhost:3000)
STAFF_SETUP_KEY                   # Double rôle :
                                  #   1. Créer le 1er admin via /api/staff/setup (one-shot,
                                  #      se désactive automatiquement après le 1er staff).
                                  #   2. Break-glass recovery via /api/staff/recover-owner
                                  #      (envoi d'un magic link recovery à un staff role=admin).
                                  # Générer avec `openssl rand -hex 32`, stocker uniquement
                                  # côté Vercel, rotater après chaque recover-owner.
CRON_SECRET                       # Protection du cron (OPTIONNEL mais recommandé)

# Analytics
NEXT_PUBLIC_MATOMO_URL
NEXT_PUBLIC_MATOMO_SITE_ID

# CTA (landing)
NEXT_PUBLIC_BOOKING_URL           # URL Calendly (défaut: https://calendly.com/earlypanel/demo)
NEXT_PUBLIC_CONTACT_EMAIL         # Email contact (défaut: contact@earlypanel.fr)
```

> **RÈGLE** : Si `NEXT_PUBLIC_SUPABASE_URL` est absent, l'app passe en mode mock.
> Si `RESEND_API_KEY` est absent, `sendEmail()` retourne `{ success: true, mock: true }` sans envoyer.
> Si `STRIPE_SECRET_KEY` est absent, `stripe` vaut `null` et les fonctionnalités de paiement sont désactivées.

---

## 2. MODULES — Rôles et responsabilités

### `middleware.ts` — Garde de route (CRITIQUE)

**Matcher** : `/app/:path*` et `/staff/:path*` uniquement.

**Règles exactes** :
1. Routes publiques exemptées : `/`, `/entreprises`, `/testeurs`, `/app/login`, `/app/auth`, `/staff/login`, `/staff/forgot`, `/api/*`, `/_next/*`, `/app/auth/*`, `/staff/auth/*`.
2. Pas de session → redirect `/app/login` (testeur) ou `/staff/login` (staff).
3. Rôle `staff`/`admin` qui accède `/app/*` → redirect `/staff/dashboard`.
4. Rôle testeur qui accède `/staff/*` → redirect `/app/dashboard`.
5. **Cookie `tp-profile`** : cache `profile_completed` pendant 7 jours (`maxAge: 604800`). Si absent → query `testers.profile_completed` via Supabase + pose le cookie.
6. Profil incomplet + pas sur `/app/onboarding` → redirect `/app/onboarding`.
7. Profil complet + sur `/app/onboarding` → redirect `/app/dashboard`.

> **DANGER** : Le cookie `tp-profile` peut être désynchronisé si `profile_completed` change côté DB (ex: admin remet à false). Le testeur reste sur le dashboard jusqu'à expiration (7j) ou suppression manuelle du cookie.

### `src/lib/supabase/admin.ts` — Client admin (CRITIQUE)

- Retourne `null` si `SUPABASE_SERVICE_ROLE_KEY` manquant.
- **RÈGLE ABSOLUE** : Chaque appelant DOIT vérifier `if (!admin) return 500`. Oublier ce check = crash `null.from(...)`.
- Utilisé par ~35 fichiers. Bypass total de la RLS.

### `src/lib/supabase/server.ts` — Client SSR (cookies)

- Client anon avec gestion cookies Next.js.
- `setAll` dans un try/catch car peut échouer depuis un Server Component.

### `src/lib/supabase/client.ts` — Client browser

- Client anon pour le navigateur. Utilisé uniquement par `staff/login`.

### `src/lib/staff-auth.ts` — Auth staff

- `getStaffUser()` : session Supabase + `app_metadata.role` ∈ `{"staff", "admin"}`.
- `getStaffMember()` : en plus, charge la ligne `staff_members`.
- Utilisé par les **22 routes** `/api/staff/*`.

### `src/lib/tester-auth.ts` — Auth testeur

- `getAuthedTester()` : session + lookup `testers.id` par `auth_user_id`.
- Retourne `{ authUserId, testerId }` ou `null`.
- Utilisé par : missions start/answers/submit/images, documents/sign.

### `src/lib/project-lifecycle.ts` — Règles cycle de vie projet (CRITIQUE)

| Fonction | Condition exacte |
|----------|-----------------|
| `projectAllowsTesterWork(status)` | `status === "active"` |
| `projectAllowsTesterMissionVisibility(projectStatus, ptStatus)` | `projectStatus === "active"` OU `ptStatus === "completed"` |
| `projectAllowsStaffAssignTesters(status)` | `status === "draft"` OU `status === "active"` |
| `projectAllowsNdaSend(status)` | `status === "draft"` OU `status === "active"` |
| `projectIsClosedForCampaign(status)` | `status === "closed"` OU `status === "archived"` |

> **RÈGLE** : Ces fonctions sont la seule source de vérité pour les permissions liées au cycle de vie projet. Ne jamais dupliquer cette logique.

### `src/lib/reward-calculator.ts` — Calcul rémunération

```
Entrées : baseRewardCents, tierRewards (JSONB), tier, staffRating
1. base = tierRewards[tier] si > 0 et défini, sinon baseRewardCents ?? 0
2. Multiplicateur : rating >= 4 → ×1.1 | rating === 3 → ×1.0 | rating <= 2 → ×0.85
3. Résultat = max(0, round(base × mult))
```

> **RÈGLE** : Tous les montants sont en **centimes** (entiers). L'affichage en euros se fait uniquement côté UI (÷100). Ne jamais stocker des euros en DB.

### `src/lib/scoring-constants.ts` — Deltas de score

```
SCORE_DELTA_MISSION_DEADLINE_EXCEEDED = -15
SCORE_DELTA_NDA_UNSIGNED_AT_CLOSURE = -15
```

> **RÈGLE** : Modifier ces valeurs impacte rétroactivement le scoring via `applyMissionClosureMalus` (appelé sur chaque GET mission testeur).

### `src/lib/apply-mission-closure-malus.ts` — Malus de clôture (FRAGILE)

**Appelé dans un GET** (`testers/missions/[id]`) — side effect sur lecture.

| Condition | Action | Flag idempotence |
|-----------|--------|-----------------|
| `end_date` passée + statut `selected`/`nda_sent` + `!malus_nda_unsigned_applied` | RPC `apply_score_change(-15)` | `malus_nda_unsigned_applied: true` |
| `end_date` passée + statut `nda_signed`/`invited`/`in_progress` + `!malus_applied` | RPC `apply_score_change(-15)` | `malus_applied: true` |

> **DANGER** : Si cette route est cachée (CDN, ISR), les malus ne seront jamais appliqués. Le cron `close-expired` ne les déclenche PAS — il ne fait que passer le projet en `closed`.

### `src/lib/persona-matcher.ts` — Attribution personas

- Matching par intersection de conditions (toutes les règles non-vides doivent matcher).
- `job_title_keywords` : `normalize` + `includes` (insensible casse + accents).
- `sectors`, `digital_levels`, `company_sizes` : inclusion exacte.
- Fallback : persona avec `is_fallback: true`.
- `persona_locked: true` → aucun recalcul.

### `src/lib/image-validation.ts` — Validation images

| Constante | Valeur |
|-----------|--------|
| `MAX_IMAGE_BYTES` | 5 242 880 (5 MB) |
| `MAX_IMAGES_PER_QUESTION` | 3 |
| `MAX_IMAGES_PER_MISSION` | 15 |
| Rate limit window | 10 minutes |
| Rate limit max | 30 requêtes par testeur |
| MIME autorisés | JPEG, PNG, WebP (détection par magic bytes) |

> **DANGER** : Le rate limiter est in-memory (`Map`). En serverless (Vercel), chaque cold start a son propre compteur → inefficace en production.

### `src/lib/email.ts` — Envoi emails

- Wrapper Resend. Si pas de `RESEND_API_KEY` : log warning + retour `{ success: true, mock: true }`.
- **DANGER** : Le code appelant ne distingue pas un vrai envoi d'un mock. Oubli de config en prod = aucun email envoyé, aucune erreur visible.

### `src/lib/nda-pdf.ts` — Génération PDF NDA

- Substitution `{{variable}}` dans le HTML du NDA.
- Format A4 (595×842 points). Police Helvetica.
- Hash SHA-256 du PDF généré, stocké dans `project_testers.nda_document_hash`.

### `src/lib/mock.ts` — Mode mock (dev)

- Activé si `!process.env.NEXT_PUBLIC_SUPABASE_URL`.
- Fournit un `MOCK_TESTER` avec des données fictives.
- État mutable en mémoire (onboarding mock).

---

## 3. GRAPHE DE DÉPENDANCES — Modules centraux

```
                    ┌──────────────────┐
                    │  supabase/admin  │ ← ~35 fichiers, bypass RLS
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴──────┐
        │ staff-auth │ │tester-auth│ │ middleware  │
        └─────┬─────┘ └─────┬─────┘ └─────┬──────┘
              │              │              │
     22 routes staff    8 routes tester  Toutes pages
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴──────┐ ┌────┴─────┐ ┌─────┴──────────┐
        │  lifecycle  │ │ scoring  │ │ reward-calc    │
        └─────┬──────┘ └────┬─────┘ └─────┬──────────┘
              │              │              │
        5 routes API    malus + answers   answers PATCH
```

### Risque de régression par module (classé par impact)

| Rang | Module | Fichiers impactés | Risque |
|------|--------|-------------------|--------|
| 1 | `supabase/admin.ts` | ~35 | Casse tout le backend si signature change |
| 2 | `middleware.ts` | Toutes pages /app /staff | Peut verrouiller ou exposer l'app |
| 3 | `types/staff.ts` | ~40 | Type `Project` (60+ champs) — rename propage partout |
| 4 | `types/tester.ts` | ~25 | Type `Tester` (60+ champs) |
| 5 | `staff-auth.ts` | 22 routes | Casse l'accès à tout le back-office |
| 6 | `project-lifecycle.ts` | 5 routes | Peut bloquer missions ou permettre actions non autorisées |
| 7 | `scoring-constants.ts` | malus + answers | Impacte le scoring de tous les testeurs |
| 8 | `reward-calculator.ts` | answers PATCH | Impacte la rémunération calculée |

---

## 4. FLUX DE DONNÉES — Parcours détaillés

### Flux 1 : Inscription testeur

```
POST /api/testers/register { email, first_name?, last_name? }
  ├─ Supabase Auth: admin.createUser({ email, email_confirm: false })
  │   └─ Si "already been registered" → 409
  ├─ INSERT testers: status="pending", profile_step=1, source="landing"
  ├─ admin.auth.generateLink({ type: "magiclink", email, redirectTo: APP_URL/app/auth/callback })
  └─ sendEmail(buildWelcomeEmail(magicLink, firstName))
      └─ Sujet: "${firstName}, complétez votre profil earlypanel →" ou sans prénom
```

### Flux 2 : Auth callback (magic link)

```
GET /app/auth/callback?code=...&token_hash=...&type=magiclink
  ├─ exchangeCodeForSession(code) OU verifyOtp({ token_hash, type: "magiclink" })
  │   └─ Échec → redirect /app/auth/error
  ├─ SELECT testers.profile_completed WHERE auth_user_id = user.id
  ├─ Cookie tp-profile = String(profileCompleted)
  │   (httpOnly, sameSite: lax, maxAge: 7 jours)
  └─ Redirect: profileCompleted ? /app/dashboard : /app/onboarding
```

### Flux 2bis : Auth callback staff (magic link / recovery)

```
GET /staff/auth/callback?code=...&token_hash=...&type=magiclink|recovery
  ├─ exchangeCodeForSession(code) OU verifyOtp({ token_hash, type })
  │   └─ Échec → redirect /staff/auth/error
  ├─ Vérif app_metadata.role ∈ {staff, admin}
  │   └─ Sinon : signOut + redirect /staff/auth/error?reason=not_staff
  ├─ Vérif staff_members existe pour auth_user_id
  │   └─ Sinon : signOut + redirect /staff/auth/error?reason=not_member
  ├─ Audit : staff.magic_link_login OU staff.password_recovery_started
  └─ Redirect: type === "recovery" ? /staff/reset : /staff/dashboard
```

### Flux 2ter : Reset password staff

```
POST /api/staff/forgot { email }
  ├─ Rate limit IP (3/min) + email (3/h)
  ├─ Vérif email existe dans staff_members (sinon 200 silencieux)
  ├─ admin.auth.admin.generateLink({ type: "recovery", redirectTo: /staff/auth/callback })
  └─ sendEmail(buildRecoveryEmail) — anti-énumération, retourne 200 systématique

GET /staff/auth/callback?token_hash=...&type=recovery
  └─ verifyOtp + redirect /staff/reset (session établie)

POST côté client : supabase.auth.updateUser({ password })
  └─ Redirect /staff/dashboard
```

### Flux 2quater : Break-glass owner recovery

```
POST /api/staff/recover-owner { email, recovery_key }
  ├─ Rate limit dur : 3 tentatives/heure par IP
  ├─ Vérif recovery_key === STAFF_SETUP_KEY (sinon 403 + audit "rejected")
  ├─ Vérif email correspond à un staff_members AVEC role='admin'
  │   └─ Sinon : 200 silencieux + audit "rejected"
  ├─ Génère magic link recovery (même chemin que /staff/forgot)
  ├─ Email avec avertissement "si ce n'est pas vous, changez la clé"
  └─ Audit : staff.recover_owner_used
```

> **NOTE** : `STAFF_SETUP_KEY` sert pour les deux endpoints (setup + recover-owner). Le setup se désactive automatiquement après le 1er admin, donc seule l'utilisation recover-owner reste possible ensuite.

### Flux 3 : Onboarding (5 étapes)

```
PATCH /api/testers/onboarding/step { step: 1..5, data: {...} }
  ├─ Validation: step doit être number 1-5, sinon 400
  ├─ Nettoyage: supprime id, created_at, email, auth_user_id du data
  ├─ UPDATE testers SET ...data, profile_step=step
  └─ Si step === 5:
       ├─ Re-SELECT * du tester
       ├─ isProfileComplete() vérifie (voir section "Profil complet" ci-dessous)
       ├─ Si complet: UPDATE status="active"
       ├─ Cookie tp-profile = "true"
       └─ Réponse: { redirect: "/app/dashboard" }
```

### Flux 4 : Projet staff → Mission testeur

```
POST /api/staff/projects { title, start_date, end_date, ... }
  ├─ Validation: start_date + end_date obligatoires, end > start
  ├─ INSERT projects: status="draft", created_by=staff.id
  └─ Trigger set_project_ref → ref_number = "PROJ-00001" (séquence)

POST .../projects/:id/use-cases { title, criteria[], questions[] }
  └─ INSERT project_use_cases + use_case_success_criteria + project_questions

POST .../projects/:id/nda { title?, content_html? }
  └─ UPSERT project_ndas (défaut: template NDA standard)

POST .../projects/:id/testers { tester_ids: [] }
  ├─ Garde: !projectIsClosedForCampaign && projectAllowsStaffAssignTesters
  └─ UPSERT project_testers: status="selected", onConflict(project_id,tester_id)

POST .../projects/:id/nda/send { tester_ids: [] }
  ├─ Si projet status="draft" → UPDATE status="active"  ← SIDE EFFECT
  ├─ Pour chaque tester_id:
  │   ├─ project_testers.status DOIT être "selected", sinon skip
  │   ├─ UPDATE status="nda_sent", nda_sent_at=now
  │   └─ sendEmail(NDA, lien /app/dashboard/documents)
  └─ Réponse: { sent, total, results[] }
```

### Flux 5 : Signature NDA → Démarrage → Soumission

```
POST /api/testers/documents/:projectId/sign
  ├─ Garde: project_testers.status DOIT être "nda_sent" exactement
  ├─ Génère PDF (pdf-lib), hash SHA-256
  ├─ Upload bucket "documents" (public)
  └─ UPDATE project_testers: status="nda_signed", nda_signed_at, hash, IP, UA

POST /api/testers/missions/:id/start
  ├─ Garde: status ∈ {"nda_signed", "invited"}, projet "active"
  ├─ Garde: start_date non futur, end_date non passé
  └─ UPDATE project_testers: status="in_progress", started_at=now

PUT /api/testers/missions/:id/answers { question_id, answer_text }
  ├─ Garde: pt.status === "in_progress", projet actif, deadline non passée
  ├─ answer_text: max 10 000 caractères
  └─ UPSERT project_tester_answers (préserve image_urls si update)

POST /api/testers/missions/:id/submit
  ├─ Garde: pt.status === "in_progress", projet actif
  ├─ Validation: TOUTES les questions doivent avoir answer_text non vide (trim)
  │   (les images ne sont PAS exigées)
  ├─ UPDATE project_testers: status="completed", submitted_at + completed_at = now
  └─ RPC apply_score_change(+5, "Soumission mission")
```

### Flux 6 : Notation staff → Paiement

```
PATCH /api/staff/projects/:id/answers { project_tester_id, rating: 1-5, note?, sloppy? }
  ├─ Garde: pt.status === "completed"
  ├─ UPDATE staff_rating, staff_note (toujours)
  ├─ Si PREMIÈRE notation (staff_rating était null):
  │   ├─ Si sloppy: delta=-20, calculated_amount=0
  │   ├─ Si rating >= 4: delta=+10
  │   ├─ Si rating === 3: delta=+2
  │   ├─ Si rating <= 2: delta=-10
  │   ├─ RPC apply_score_change(delta)
  │   ├─ Si !sloppy && rating >= 3: missions_completed += 1
  │   │   └─ Trigger recalculate_tester_tier (peut changer tier + suspendre)
  │   └─ UPSERT tester_payouts (calculated + final = computeDefaultRewardCents)
  └─ Si re-notation: update amounts sauf si staff a override le final

POST /api/staff/projects/:id/payouts/pay { payout_ids: [] }
  ├─ Par payout:
  │   ├─ Si déjà "paid" → skip
  │   ├─ Si "failed" → reset à "pending"
  │   ├─ Si final_amount_cents <= 0 → marque "paid" sans Stripe
  │   ├─ Si !stripe_account_id → erreur "Compte Stripe non configuré"
  │   └─ stripe.transfers.create({
  │       amount: cents, currency: "eur", destination: stripe_account_id,
  │       idempotencyKey: `tp_${payoutId}`
  │     })
  ├─ Succès: status="paid", paid_at, stripe_transfer_id
  ├─ UPDATE testers.total_earned += cents/100 (en euros, Number)
  └─ Échec: status="failed", last_error=message
```

### Flux 7 : Webhook Stripe

```
POST /api/webhooks/stripe
  ├─ Vérifie signature avec STRIPE_WEBHOOK_SECRET
  ├─ transfer.paid: si metadata.payout_id et status !== "paid"
  │   → UPDATE paid + total_earned += final_amount_cents/100
  ├─ transfer.failed / transfer.reversed: si pas déjà "paid"
  │   → UPDATE status="failed", last_error=eventType
  └─ Toujours { received: true }
```

> **DANGER double crédit** : `payouts/pay` ET le webhook `transfer.paid` incrémentent tous deux `total_earned`. Si le transfert réussit et que le webhook arrive, le montant est crédité 2×. Le code du webhook vérifie `status !== "paid"` mais la route `pay` met `paid` avant le webhook → normalement safe. Cependant, en cas de race condition (webhook arrive avant l'update de `pay`), double crédit possible.

### Flux 8 : Clôture automatique

```
GET /api/cron/close-expired (Vercel cron, toutes les heures)
  ├─ Auth: Bearer CRON_SECRET (si CRON_SECRET défini)
  ├─ SELECT projects WHERE status="active" AND end_date < now()
  └─ UPDATE status="closed" (en masse)
```

> Le cron NE déclenche PAS les malus. Ceux-ci sont appliqués lazily quand un testeur consulte sa mission (GET detail).

### Flux 9 : Invitation testeur (automatisée)

```
POST /api/staff/projects/:id/testers/invite { tester_ids: [] }
  ├─ Garde: !projectIsClosedForCampaign && projectAllowsStaffAssignTesters
  │         && projectAllowsNdaSend && questions ≥ 1
  ├─ Filtre: testeurs status="active" AND profile_completed=true
  ├─ Auto-création NDA via defaultNdaHtml() si absent
  ├─ Si projet="draft" → UPDATE status="active"
  ├─ Pour chaque testeur eligible :
  │   ├─ sendEmail (NDA invitation) — AVANT toute transition DB
  │   ├─ Si exist en "selected" → UPDATE status="nda_sent" (filtre status)
  │   └─ Sinon INSERT direct status="nda_sent"
  └─ Audit: project.testers_invited (avec metadata results[])
```

> Cet endpoint remplace le couple `POST .../testers` + `POST .../nda/send` pour le cas "inviter directement". L'ancien `POST .../testers` reste pour les shortlists sans envoi (status="selected").

### Flux 10 : Crons de relance

```
GET /api/cron/nda-reminders (cron quotidien, 09h00 UTC)
  ├─ Auth Bearer CRON_SECRET
  ├─ SELECT project_testers
  │     WHERE status="nda_sent"
  │       AND nda_sent_at < now() - 3j
  │       AND (nda_reminder_sent_at IS NULL OR nda_reminder_sent_at < now() - 3j)
  ├─ Skip si projet not active OR end_date < now()
  ├─ sendEmail relance + UPDATE nda_reminder_sent_at = now()
  └─ Audit: nda.reminder_batch

GET /api/cron/project-reminders (cron quotidien, 09h00 UTC)
  ├─ Auth Bearer CRON_SECRET
  ├─ SELECT projects status="active" AND end_date IS NOT NULL
  ├─ Filtre côté app : now >= start + (end - start)/2 (mi-parcours)
  ├─ Pour chaque projet à mi-parcours :
  │   ├─ SELECT project_testers WHERE status IN (nda_signed, invited, in_progress)
  │   │       AND project_midway_reminder_sent_at IS NULL
  │   ├─ sendEmail rappel mission + UPDATE project_midway_reminder_sent_at = now()
  └─ Audit: project.midway_reminder_batch
```

> Idempotence garantie par les colonnes `nda_reminder_sent_at` (cooldown 3j) et `project_midway_reminder_sent_at` (one-shot par projet/testeur).

### Flux 11 : Audit de signature NDA (preuve juridique)

```
POST /api/testers/documents/:projectId/sign (existant)
  ├─ Génère PDF + hash SHA-256 + upload bucket privé
  ├─ Transition atomique nda_sent → nda_signed
  ├─ Email post-signature → /app/dashboard/missions
  └─ logStaffAction: nda.signed_by_tester
       metadata: {
         tester_id, project_id, nda_ref,
         document_hash, document_path,
         signed_at_iso, tester_email,
         tester_first_name, tester_last_name, tester_birth_date
       }
       request: { ip, user_agent } (capturés automatiquement par logStaffAction)
```

> Le `staff_audit_log` étant append-only (pas d'UPDATE/DELETE possible côté service_role autre que les opérations explicites), la trace de signature constitue une preuve immuable séparée de `project_testers` qui peut elle être modifiée. En cas de litige, on dispose à la fois du PDF stocké, du hash, du timestamp serveur et d'une entrée d'audit indépendante.

---

## 5. CONVENTIONS & PATTERNS

### Auth pattern (toutes les routes API)

```typescript
// Staff
const staff = await getStaffMember();
if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
const admin = createAdminClient();
if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

// Testeur
const authed = await getAuthedTester();
if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
```

### Réponses JSON

- Succès : `{ data: ... }` ou `{ success: true }` ou données directes.
- Erreur : `{ error: "message" }` avec status HTTP approprié.
- Résultats partiels : `{ sent, total, results: [{ success, error? }] }`.

### Style de code

- TypeScript strict, pas de `.js`.
- Server Components par défaut, `"use client"` explicite.
- Pas d'ORM : requêtes Supabase directes (`.from().select().eq()`).
- Pas de state management global : React Context local aux layouts.
- Tailwind v4 inline, pas de CSS modules.
- Commentaires en français dans le code métier, noms de variables en anglais.
- Logging : `console.log("[Domain]")` par préfixe (Email, Stripe, Register...).

### Tests

- **AUCUN TEST AUTOMATISÉ** dans le projet. Zéro fichier test.

---

## 6. MACHINES À ÉTATS — Transitions exactes

### `project.status` : draft → active → closed → archived

| Transition | Déclencheur | Condition |
|------------|-------------|-----------|
| `draft → active` | `POST .../nda/send` (envoi premier NDA) | Automatique si status était draft |
| `draft → active` | `PATCH .../projects/:id` { status: "active" } | Manuel staff |
| `active → closed` | Cron `close-expired` | `end_date < now()` |
| `active → closed` | `PATCH .../projects/:id` { status: "closed" } | Manuel staff |
| `closed → active` | `PATCH .../projects/:id` { status: "active", end_date } | Réactivation staff (nouvelle end_date obligatoire) |
| `closed → archived` | `PATCH .../projects/:id` { status: "archived" } | Manuel staff |
| `archived → active` | `PATCH .../projects/:id` { status: "active", end_date } | Réactivation staff |

> **RÈGLE** : Le PATCH projet ne valide PAS les transitions. N'importe quel status peut être mis via PATCH. Les gardes sont côté UI (boutons conditionnels) et dans les routes spécialisées (NDA send, testers assign).

### `project_testers.status` : workflow séquentiel

```
selected → nda_sent → nda_signed → invited → in_progress → completed
                                                              ↑
                                                        (pas de retour)
```

| Transition | Route | Condition exacte |
|------------|-------|-----------------|
| `selected → nda_sent` | `POST .../nda/send` | `pt.status === "selected"` |
| `nda_sent → nda_signed` | `POST .../documents/:projectId/sign` | `pt.status === "nda_sent"` |
| `nda_signed → in_progress` | `POST .../missions/:id/start` | `pt.status ∈ {"nda_signed", "invited"}` + projet actif + dans la fenêtre dates |
| `invited → in_progress` | idem | idem |
| `in_progress → completed` | `POST .../missions/:id/submit` | `pt.status === "in_progress"` + toutes questions répondues |

> **ATTENTION** : Le statut `invited` n'est JAMAIS posé par le code actuel. Il est prévu dans le workflow mais aucune route ne l'attribue. La transition `nda_signed → in_progress` est la plus courante.

> **DANGER** : `PATCH .../testers/[testerId]` (route staff) fait `update(body)` sans validation de colonnes. Un staff pourrait théoriquement passer un `status` arbitraire.

### `tester.status` : pending → active → suspended → rejected

| Transition | Déclencheur | Condition exacte |
|------------|-------------|-----------------|
| `pending → active` | Trigger `auto_activate_tester` (BEFORE UPDATE) | Tous les champs requis remplis (voir ci-dessous) |
| `active → suspended` | Trigger `recalculate_tester_tier` | `quality_score < 40` ET `status !== "rejected"` |
| `* → rejected` | Manuel (pas de route dédiée, via DB directe) | — |

### `tester_payouts.status` : pending → approved → paid / failed

| Transition | Route | Condition |
|------------|-------|-----------|
| Création `pending` | `PATCH .../answers` (notation) | Première notation staff |
| `pending → paid` | `POST .../payouts/pay` | Stripe transfer réussi ou montant ≤ 0 |
| `pending → failed` | `POST .../payouts/pay` | Stripe transfer échoue |
| `failed → pending` | `POST .../payouts/pay` | Retry automatique |
| `* → paid` | Webhook `transfer.paid` | Si pas déjà `paid` |
| `* → failed` | Webhook `transfer.failed/reversed` | Si pas déjà `paid` |

---

## 7. RÈGLES MÉTIER EXACTES (depuis le code)

### 7.1 Profil testeur complet — Trigger `auto_activate_tester()` (migration 026)

**Champs texte requis** (non null ET non vide) :
- Identité : `first_name`, `last_name`, `phone`, `birth_date`
- **Adresse** (requis depuis migration 026 pour le NDA) : `address`, `city`, `postal_code`
- Pro : `job_title`, `sector`, `company_size`
- Tech : `digital_level`, `connection`
- Préférences : `availability`, `ux_experience`

**Champs tableau requis** (non null ET au moins 1 élément) :
- `tools`, `browsers`, `devices`, `interests`

**Total** : 18 champs obligatoires (14 texte + 4 tableaux).

> **RÈGLE** : `timeslots` et `gender` ne sont PAS requis par le trigger.

> **ATTENTION** : Ajouter un champ à cette liste dans le trigger SANS le rendre collectible dans l'onboarding = les testeurs ne pourront JAMAIS devenir actifs. Toute modification doit aussi être reflétée dans [`src/lib/profile-completeness.ts`](src/lib/profile-completeness.ts) (source de vérité côté app).

> **MIGRATION 026** : ajout de `address`, `city`, `postal_code`, `birth_date` aux champs requis. Backfill rétroactif : tous les testeurs `active` sans ces champs ont été repassés en `pending`.

### 7.2 Calcul du tier — Trigger `recalculate_tester_tier()` (version migration 010)

```sql
-- Borne le score
IF quality_score < 0 THEN quality_score := 0;
IF quality_score > 100 THEN quality_score := 100;

-- Tier
IF quality_score >= 80 AND missions_completed >= 5 THEN tier := 'premium';
ELSIF quality_score >= 65 AND missions_completed >= 2 THEN tier := 'expert';
ELSE tier := 'standard';

-- Suspension automatique
IF quality_score < 40 AND OLD.status NOT IN ('rejected') THEN status := 'suspended';
```

**Déclenché par** : `BEFORE UPDATE OF quality_score, missions_completed`

| Tier | Score minimum | Missions minimum |
|------|---------------|-----------------|
| premium | ≥ 80 | ≥ 5 |
| expert | ≥ 65 | ≥ 2 |
| standard | (défaut) | — |
| → suspended | < 40 | — |

### 7.3 Scoring — RPC `apply_score_change()`

```sql
-- SECURITY DEFINER (bypass RLS)
UPDATE testers SET quality_score = quality_score + p_delta WHERE id = p_tester_id;
INSERT INTO tester_score_events (tester_id, project_id, delta, reason, new_score);
RETURN v_new_score;
```

**Score initial** : 100 (défaut DB).

**Deltas appliqués dans le code** :

| Événement | Delta | Route |
|-----------|-------|-------|
| Soumission mission | +5 | `missions/submit` |
| Notation staff ≥ 4 | +10 | `answers` PATCH |
| Notation staff = 3 | +2 | `answers` PATCH |
| Notation staff ≤ 2 | -10 | `answers` PATCH |
| Travail bâclé (sloppy) | -20 | `answers` PATCH |
| Mission non soumise à la clôture | -15 | `applyMissionClosureMalus` (GET detail) |
| NDA non signé à la clôture | -15 | `applyMissionClosureMalus` (GET detail) |

> **RÈGLE** : Le scoring de la notation est "once" : vérifie `pt.staff_rating == null` avant d'appliquer. Si cette condition est retirée, double application.

### 7.4 Rémunération

```
1. base = project.tier_rewards[tester.tier] (si > 0) || project.base_reward_cents || 0
2. mult = rating >= 4 ? 1.1 : rating === 3 ? 1.0 : rating <= 2 ? 0.85 : 1
3. Si sloppy → calculated = 0
4. amount = max(0, round(base × mult))
```

**Règles payouts** :
- Un seul payout par `project_tester_id` (UNIQUE constraint).
- Si payout existe et `status === "paid"` → aucune modification.
- Si staff a overridé `final_amount_cents` (≠ calculated), le override est conservé.

### 7.5 Idempotence Stripe

- `idempotencyKey: \`tp_${payoutId}\`` pour chaque transfert.
- **NE JAMAIS changer ce format** : risque de recréer des transferts déjà effectués.

### 7.6 Référence projet

- Format : `PROJ-XXXXX` (séquence PostgreSQL, padded 5 chiffres).
- Trigger `BEFORE INSERT` : ne génère que si `ref_number IS NULL OR ref_number = ''`.
- Passer un `ref_number` explicite court-circuite le trigger.

### 7.7 Images mission

| Règle | Valeur |
|-------|--------|
| Taille max par image | 5 MB |
| Images max par question | 3 |
| Images max par mission | 15 |
| Formats acceptés (server) | JPEG, PNG, WebP (vérification magic bytes) |
| Compression client | Canvas → JPEG quality 0.82, max 1920px dimension |
| Rate limit | 30 req / 10 min par testeur (in-memory) |
| Path storage | `{projectId}/{testerId}/{questionId}/{uuid}.{ext}` |

### 7.8 Réponses mission

- Max 10 000 caractères par réponse texte.
- Auto-save UI : debounce 2 secondes, save immédiat au blur.
- Soumission exige TOUTES les questions avec texte non vide (trim). Les images ne sont pas exigées.

### 7.9 NDA

- Un seul NDA par projet (UNIQUE sur `project_id`).
- Variables : syntaxe `{{variable_name}}` dans le HTML.
- Signature : statut `nda_sent` requis. Génère PDF + hash SHA-256 + upload.
- Bucket `documents` : créé comme public si absent.

### 7.10 Notifications testeur

```
missions = count(pt WHERE status ∈ {nda_signed, invited, in_progress}
                   AND project.status === "active"
                   AND (pas de end_date OU end_date >= aujourd'hui))
documents = count(pt WHERE status === "nda_sent")
profil = 1 si (address OR city OR postal_code OR birth_date) manquant, sinon 0
```

### 7.11 Staff setup

- `STAFF_SETUP_KEY` requis.
- Mot de passe : minimum 8 caractères.
- Crée un utilisateur Auth avec `app_metadata.role = "staff"`.
- Si email déjà enregistré : update metadata + upsert `staff_members` role `admin`.
- Nouvel utilisateur : insert `staff_members` role `admin`.

---

## 8. SCHÉMA BASE DE DONNÉES — Détail complet

### Tables et colonnes

#### `testers`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL, now() |
| email | TEXT | UNIQUE NOT NULL |
| first_name, last_name, phone, linkedin_url, job_title, sector, company_size | TEXT | |
| digital_level | TEXT | CHECK ∈ (debutant, intermediaire, avance, expert) |
| tools, browsers, devices, timeslots, interests | TEXT[] | DEFAULT '{}' |
| phone_model, mobile_os | TEXT | |
| connection | TEXT | CHECK ∈ (Fibre, ADSL, 4G/5G) |
| availability | TEXT | CHECK ∈ (1-2, 3-5, 5+) |
| ux_experience | TEXT | CHECK ∈ (Jamais, Quelquefois, Régulièrement) |
| address, city, postal_code | TEXT | |
| birth_date | DATE | |
| gender | TEXT | CHECK ∈ (female, male, non_binary, prefer_not_to_say) |
| source | TEXT | |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK ∈ (pending, active, suspended, rejected) |
| stripe_account_id | TEXT | |
| payment_setup | BOOLEAN | DEFAULT FALSE |
| quality_score | INTEGER | DEFAULT 100 |
| tier | TEXT | DEFAULT 'standard', CHECK ∈ (standard, expert, premium) |
| missions_completed | INTEGER | DEFAULT 0 |
| total_earned | NUMERIC | DEFAULT 0 |
| auth_user_id | UUID | FK → auth.users ON DELETE SET NULL |
| profile_completed | BOOLEAN | DEFAULT FALSE |
| profile_step | INTEGER | DEFAULT 1 |
| persona_id | UUID | FK → tester_personas ON DELETE SET NULL |
| persona_locked | BOOLEAN | NOT NULL DEFAULT false |

#### `staff_members`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK |
| auth_user_id | UUID | UNIQUE, FK → auth.users ON DELETE CASCADE |
| email | TEXT | UNIQUE NOT NULL |
| first_name, last_name | TEXT | |
| role | TEXT | NOT NULL DEFAULT 'staff', CHECK ∈ (staff, admin) |

#### `projects`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK |
| created_by | UUID | FK → staff_members ON DELETE SET NULL |
| status | TEXT | NOT NULL DEFAULT 'draft', CHECK ∈ (draft, active, closed, archived) |
| title | TEXT | NOT NULL |
| description | TEXT | |
| company_name, sector, contact_* | TEXT | |
| ref_number | TEXT | Auto-généré par trigger (PROJ-XXXXX) |
| start_date, end_date | TIMESTAMPTZ | |
| urls, target_gender, target_csp, target_locations | TEXT[] | DEFAULT '{}' |
| target_age_min, target_age_max | INTEGER | |
| target_sector | TEXT | |
| target_sector_restricted | BOOLEAN | DEFAULT FALSE |
| base_reward_cents | INTEGER | Nullable, en centimes |
| tier_rewards | JSONB | Nullable, ex: {"standard": 2000, "expert": 2500} |
| client_id | UUID | FK → b2b_clients ON DELETE SET NULL |
| business_objective | TEXT | |
| scope_included, scope_excluded | TEXT[] | DEFAULT '{}' |
| client_guidelines | TEXT | |
| test_type | TEXT | DEFAULT 'unmoderated', CHECK ∈ (moderated, unmoderated) |
| audit_enabled | BOOLEAN | DEFAULT FALSE |
| audit_*_score | INTEGER | CHECK 0-100 |
| audit_findings | TEXT[] | DEFAULT '{}' |

#### `project_testers`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK |
| project_id | UUID | NOT NULL FK → projects CASCADE |
| tester_id | UUID | NOT NULL FK → testers CASCADE |
| status | TEXT | DEFAULT 'selected', CHECK ∈ (selected, nda_sent, nda_signed, invited, in_progress, completed) |
| nda_document_url, nda_signer_ip, nda_signer_user_agent, nda_document_hash | TEXT | |
| nda_sent_at, nda_signed_at, invited_at, started_at, submitted_at, completed_at | TIMESTAMPTZ | |
| nda_reminder_sent_at | TIMESTAMPTZ | Cooldown des relances NDA (cron, 3j) |
| project_midway_reminder_sent_at | TIMESTAMPTZ | One-shot rappel mi-parcours (cron) |
| staff_rating | INTEGER | CHECK 1-5 |
| staff_note | TEXT | |
| malus_applied | BOOLEAN | DEFAULT FALSE |
| malus_nda_unsigned_applied | BOOLEAN | NOT NULL DEFAULT FALSE |
| **UNIQUE** | (project_id, tester_id) | |

#### `project_tester_answers`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK |
| project_id | UUID | NOT NULL FK → projects CASCADE |
| tester_id | UUID | NOT NULL FK → testers CASCADE |
| question_id | UUID | NOT NULL FK → project_questions CASCADE |
| answer_text | TEXT | |
| image_urls | TEXT[] | DEFAULT '{}' |
| **UNIQUE** | (project_id, tester_id, question_id) | |

> **DANGER CASCADE** : `project_questions` a FK CASCADE vers `projects`. `project_tester_answers` a FK CASCADE vers `project_questions`. Le PATCH projet **supprime et recrée** toutes les questions → **toutes les réponses existantes sont supprimées** par cascade.

#### `tester_payouts`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK |
| project_id, tester_id | UUID | FK CASCADE |
| project_tester_id | UUID | NOT NULL FK → project_testers CASCADE, **UNIQUE** |
| calculated_amount_cents | INTEGER | NOT NULL DEFAULT 0 |
| final_amount_cents | INTEGER | NOT NULL |
| status | TEXT | DEFAULT 'pending', CHECK ∈ (pending, approved, paid, failed) |
| stripe_transfer_id, last_error | TEXT | |
| idempotency_key | TEXT | **UNIQUE** |
| paid_at | TIMESTAMPTZ | |

#### `project_reports` (1 par projet)
| Colonne | Type |
|---------|------|
| summary | JSONB DEFAULT '{}' |
| bugs | JSONB DEFAULT '[]' |
| frictions | JSONB DEFAULT '[]' |
| recommendations | JSONB DEFAULT '[]' |
| impact_effort_matrix | JSONB DEFAULT '{}' |
| status | TEXT CHECK ∈ (draft, published) |

#### Autres tables
- `project_ndas` : 1 par projet (UNIQUE project_id), `title`, `content_html`.
- `project_use_cases` : par projet, avec `order`, `task_wording`, `expected_testers_count`.
- `use_case_success_criteria` : par use case, `label`, `is_primary`, `order`.
- `use_case_completions` : par (project_tester, criterion), `passed`, UNIQUE.
- `tester_score_events` : historique scoring avec delta, reason, new_score.
- `tester_personas` : slug UNIQUE, matching_rules JSONB, priority, is_fallback.
- `b2b_clients` : company_name NOT NULL, status CHECK ∈ (active, archived).

### Storage Buckets

| Bucket | Contenu | Accès |
|--------|---------|-------|
| `mission-images` | Images uploadées par testeurs | Signed URLs (1h) |
| `documents` | PDF NDA signés | **Privé** (forced via `ensureDocumentsBucketPrivate`). URLs signées 1h générées à la volée. Path stocké en DB sous `storage:<path>` |

---

## 9. ZONES FRAGILES — Liste exhaustive

### Fichiers à modifier avec extrême prudence

| Fichier | Risque | Conséquence d'une erreur |
|---------|--------|--------------------------|
| `middleware.ts` | Expose ou bloque toute l'app | Accès non autorisé ou app inaccessible |
| `supabase/admin.ts` | Casse tout le backend | Toutes les API routes 500 |
| `staff-auth.ts` / `tester-auth.ts` | Casse l'authentification | Accès non autorisé ou bloqué |
| `project-lifecycle.ts` | Casse les permissions | Missions inaccessibles ou actions non autorisées |
| `answers/route.ts` (PATCH) | Scoring + payouts + tier | Double scoring, mauvaise rémunération, tier incorrect |
| `payouts/pay/route.ts` | Paiements réels | Double paiement, argent perdu |
| `apply-mission-closure-malus.ts` | Side effect sur GET | Malus non appliqués ou appliqués en double |
| `nda/send/route.ts` | Change le status du projet | Projet activé prématurément |
| `testers/invite/route.ts` | Email + transition `nda_sent` atomique | Invitation sans email ou doublon |
| `documents/[projectId]/sign/route.ts` | Génère le PDF, hash, audit log immuable | Trace de signature corrompue = preuve juridique perdue |
| `staff/auth/callback/route.ts` | Verify + double-check rôle/membership | Accès staff non autorisé en cas de régression |
| `staff/recover-owner/route.ts` | Break-glass admin | Si la garde `role='admin'` saute, recovery sur n'importe quel staff |
| `cron/*/route.ts` | Side effects en lot (close, relances, malus) | Spam mass mail ou malus appliqués 2× |
| `ProjectForm.tsx` (~800 lignes) | Monolithique, beaucoup d'état | Régression UI silencieuse |

### Triggers DB à ne PAS modifier sans comprendre l'impact

| Trigger | Table | Impact |
|---------|-------|--------|
| `auto_activate_tester` | testers | Si modifié : testeurs bloqués en pending forever ou activés sans profil |
| `recalculate_tester_tier` | testers | Si seuils changent : tous les testeurs recalculés au prochain update |
| `set_project_ref` | projects | Si format change : incohérence des refs existantes |
| `apply_score_change` (RPC) | testers + score_events | SECURITY DEFINER — toute faille = manipulation de scores |

---

## 10. CONTRATS IMPLICITES — Invariants à ne JAMAIS casser

### C1 — Cascade questions → réponses
Le PATCH projet supprime+recrée les `project_questions`. La FK CASCADE sur `project_tester_answers.question_id` **détruit toutes les réponses existantes**.
> **RÈGLE** : NE JAMAIS modifier les questions d'un projet qui a des missions `in_progress` ou `completed`. Le code actuel ne vérifie PAS cette condition.

### C2 — Cookie tp-profile
Le middleware se fie au cookie `tp-profile` (durée 7 jours) pour éviter une query DB. Si `profile_completed` change en DB, le cookie est périmé.
> **RÈGLE** : Toute modification de `profile_completed` côté API doit aussi poser/invalider le cookie.

### C3 — Scoring "once"
La notation staff applique les deltas de score uniquement si `staff_rating == null` (première fois).
> **RÈGLE** : Ne jamais retirer cette condition. Ne jamais remettre `staff_rating` à null via une autre route.

### C4 — apply_score_change est SECURITY DEFINER
La RPC bypasse la RLS. Le delta est appliqué sans vérification de bornes — c'est le trigger `recalculate_tester_tier` qui borne ensuite 0–100.
> **RÈGLE** : Le trigger DOIT toujours exister et borner. Supprimer le trigger = scores négatifs ou > 100.

### C5 — Malus sur GET
`applyMissionClosureMalus` est appelé dans un GET (lecture mission). C'est un side effect volontaire.
> **RÈGLE** : Ne jamais cacher cette route (CDN/ISR). Ne jamais supprimer cet appel sans déplacer la logique ailleurs (ex: cron).

### C6 — Montants en centimes
Tous les montants en DB sont en centimes (integers) : `base_reward_cents`, `tier_rewards`, `calculated_amount_cents`, `final_amount_cents`.
> **RÈGLE** : L'UI divise par 100 pour afficher en euros. Ne jamais stocker des euros.

### C7 — Idempotency Stripe
`idempotencyKey: \`tp_${payoutId}\`` — format figé.
> **RÈGLE** : Changer ce format = risque de double paiement pour les payouts existants.

### C8 — RLS fermée
Presque toutes les politiques RLS sont `USING(false)`. L'accès réel passe par `service_role`.
> **RÈGLE** : Si on ajoute Supabase Realtime ou un accès client direct, rien ne sera accessible sans ajouter des politiques.

### C9 — Email silencieux
Sans `RESEND_API_KEY`, `sendEmail` retourne `{ success: true, mock: true }`. Aucune distinction côté appelant.
> **RÈGLE** : Toujours vérifier que `RESEND_API_KEY` est configuré en production. Il n'y a pas d'alerte automatique.

### C10 — Cron non protégé
Si `CRON_SECRET` n'est pas défini, `GET /api/cron/close-expired` est accessible publiquement.
> **RÈGLE** : Toujours définir `CRON_SECRET` en production.

### C11 — Transition draft → active implicite
L'envoi de NDA (`nda/send`) passe automatiquement le projet de `draft` à `active`.
> **RÈGLE** : C'est voulu. Mais un staff qui envoie un NDA sans le savoir déclenche l'activation du projet.

### C12 — status "invited" fantôme
Le statut `invited` est dans le CHECK constraint mais **aucune route ne le pose jamais**. Les testeurs passent directement de `nda_signed` à `in_progress`.
> **RÈGLE** : Si on implémente le statut `invited`, il faut adapter les routes `start` (déjà compatible) et `missions/route` (le filtre l'inclut déjà).

### C13 — total_earned en euros (pas centimes)
`testers.total_earned` est incrémenté de `cents / 100` (conversion en euros) dans `payouts/pay` et le webhook.
> **RÈGLE** : C'est un `NUMERIC` en euros, pas en centimes. Incohérent avec le reste du modèle (qui est en centimes). Ne pas convertir deux fois.

### C14 — PATCH projet testers avec whitelist (résolu)
`PATCH /api/staff/projects/:id/testers/[testerId]` whiteliste explicitement les colonnes modifiables : `staff_rating` (1-5, validation Number.isInteger) et `staff_note` (string, max 4000 car.). `PATCH /api/staff/testers/:id` whiteliste `persona_id`, `persona_locked`, `gender`. Le statut, les timestamps et les flags malus ne sont jamais modifiables via PATCH générique.
> **RÈGLE** : Conserver ce pattern de whitelist. Les transitions de statut passent exclusivement par les routes dédiées (nda/send, missions/start, submit, answers).

### C15 — Rate limiter in-memory
Le rate limiter d'images utilise un `Map` en mémoire. En serverless, chaque instance a son propre compteur.
> **RÈGLE** : Inefficace en production Vercel. Pour une vraie protection, migrer vers Redis ou un KV store.

### C16 — Anti-énumération sur les endpoints d'auth staff
`/api/staff/login/magic`, `/api/staff/forgot`, `/api/staff/recover-owner` retournent **toujours `200`** que l'email existe ou non (sauf erreur de format). C'est volontaire.
> **RÈGLE** : Ne jamais ajouter une réponse `404 "Email inconnu"` à ces routes. Cela permettrait à un attaquant d'énumérer les comptes staff.

### C17 — STAFF_SETUP_KEY = double rôle
La même clé sert pour `/api/staff/setup` (bootstrap) **et** `/api/staff/recover-owner` (break-glass). Le setup se désactive automatiquement après le 1er admin créé en prod, mais la clé reste valide pour recover-owner.
> **RÈGLE** : Rotater cette clé après chaque utilisation réelle de recover-owner. Ne **jamais** la commit.

### C18 — Audit signature NDA = preuve juridique
La table `staff_audit_log` est append-only (RLS `USING(false)`, pas d'UPDATE/DELETE côté code). L'entrée `nda.signed_by_tester` posée par `documents/[projectId]/sign/route.ts` constitue une preuve **séparée** de `project_testers.nda_*` qui peut elle être modifiée.
> **RÈGLE** : Ne jamais ajouter de chemin code qui modifie ou supprime `staff_audit_log`. Ne jamais retirer le `logStaffAction({ action: "nda.signed_by_tester", ... })` de la route de signature. Ne jamais réduire le payload `metadata` (hash, IP, UA, timestamps, identité tester) — il sert en cas de litige.

### C19 — Idempotence des crons par colonne DB
- `cron/nda-reminders` : guard via `nda_reminder_sent_at < now() - 3j` (cooldown)
- `cron/project-reminders` : guard via `project_midway_reminder_sent_at IS NULL` (one-shot)
- `cron/close-expired` : guard via `status = 'active' AND end_date < now()` (transition mono-directionnelle)
> **RÈGLE** : Si on touche au critère de sélection d'un cron, mettre à jour la colonne d'idempotence dans la même requête. Ne jamais retirer le `UPDATE ... reminder_sent_at = now()` après l'envoi : sans ça, le testeur reçoit le même email N fois par jour.

### C20 — Email-AVANT-DB sur les routes critiques
`nda/send`, `testers/invite` envoient l'email **avant** la transition de statut. Si l'email échoue, le statut ne change pas → retry possible. Si la transition DB échoue après envoi, l'email est déjà parti (pas de rollback) → on log une erreur explicite.
> **RÈGLE** : Préserver cet ordre. Inverser (DB d'abord) crée des testeurs en `nda_sent` qui n'ont jamais reçu d'email — silencieux et difficile à détecter.

### C22 — Source unique de vérité pour la complétude profil
[`src/lib/profile-completeness.ts`](src/lib/profile-completeness.ts) définit `REQUIRED_FIELDS` (18 entrées) qui doit rester en phase parfaite avec le trigger `auto_activate_tester()` (migrations 004 + 026).
> **RÈGLE** : Toute modification des champs requis doit toucher **simultanément** la migration trigger ET le fichier `profile-completeness.ts`. Sinon désynchronisation : soit l'app dit "incomplet" et le trigger active quand même, soit l'app dit "complet" mais le trigger refuse l'activation.

Utilisé par :
- `/api/testers/notifications` (badge "Mon profil" avec count exact)
- `/app/dashboard/profil` (panel "X champs à compléter" groupé par catégorie)
- `/api/staff/projects/:id/testers/invite` (défense en profondeur via `isTesterEligibleForInvitation`)
- `/api/staff/projects/:id/testers` POST (idem)
- `ProjectTestersTab.tsx` (checkbox désactivée + badge "incomplet" si `profile_completed=false`)

### C23 — Filtrage staff sur `profile_completed=true`
`/api/staff/testers?status=active` filtre **automatiquement** `profile_completed=true` côté serveur. Sans ça, un edge case (admin DB direct, bug futur) pourrait laisser un tester `active` mais incomplet apparaître dans la liste de sélection projet.
> **RÈGLE** : Ne jamais retirer ce filtre. La liste "actifs" exposée au staff doit être strictement = "invitable maintenant".

### C21 — Bucket `documents` privé obligatoire
`ensureDocumentsBucketPrivate()` force le bucket à `public: false` à chaque signature, et bascule un bucket historique public vers privé. Les NDA signés contiennent des données personnelles (adresse, date de naissance, IP).
> **RÈGLE** : Ne jamais créer le bucket `documents` en `public: true`. Ne jamais retirer cette garde. Les valeurs `nda_document_url` préfixées `storage:<path>` sont résolues en URL signées 1h à la volée — ne pas stocker d'URL publique.

---

## 11. LISTES DE VALEURS CANONIQUES

### Secteurs (onboarding tester vs landing vs staff)

**Step2Professional.tsx** : Tech / SaaS, E-commerce, Finance / Banque, Assurance, Santé, RH / Recrutement, Juridique, Éducation, Immobilier, Transport / Logistique, Industrie, Autre.

**data/sectors.ts** (landing B2B) : SaaS B2B, E-commerce, Fintech, Healthtech, RH & recrutement, Logistique, Éducation, Immobilier, Juridique & compliance, Marketplace, Application mobile, Industrie 4.0, Assurance, Banque & crédit, Retail & grande distribution.

> **INCOHÉRENCE** : Les deux listes ne correspondent pas. Les secteurs stockés en DB viennent de l'onboarding et ne matchent pas forcément les filtres staff.

### Appareils

**Step4Technical.tsx** : PC Windows, PC Linux, Mac, iPhone, Smartphone Android, Autre smartphone, iPad, Tablette Android, Autre tablette.

**ProjectTestersTab.tsx filtre** : valeurs légèrement différentes (ex: "Android" vs "Smartphone Android").

> **INCOHÉRENCE** : Les filtres staff peuvent ne pas matcher les valeurs stockées.

### Niveaux digitaux

`debutant` | `intermediaire` | `avance` | `expert` — cohérent partout (CHECK constraint DB).

### Disponibilités

`1-2` | `3-5` | `5+` — cohérent (CHECK constraint DB).

### Connexion

`Fibre` | `ADSL` | `4G/5G` — cohérent (CHECK constraint DB, attention au `/` dans 4G/5G).

### UX Experience

`Jamais` | `Quelquefois` | `Régulièrement` — cohérent (CHECK constraint DB).

### Genre

`female` | `male` | `non_binary` | `prefer_not_to_say` — cohérent (CHECK constraint DB).

---

## 12. CHECKLIST AVANT MODIFICATION

Avant toute modification, vérifier :

**Cohérence métier**
- [ ] Le fichier modifié est-il dans la liste des zones fragiles (section 9) ?
- [ ] La modification touche-t-elle à un contrat implicite (section 10) ?
- [ ] Les types dans `types/staff.ts` ou `types/tester.ts` sont-ils impactés ?
- [ ] Y a-t-il un trigger DB qui pourrait interférer ?
- [ ] Les transitions d'état (section 6) restent-elles cohérentes ?
- [ ] Les montants manipulés sont-ils en centimes (DB) ou euros (UI) ?
- [ ] Le cookie `tp-profile` doit-il être mis à jour ?
- [ ] La route modifiée est-elle côté testeur (potentiellement appelée en GET avec side effects) ?
- [ ] Les FK CASCADE peuvent-elles supprimer des données en cascade ?
- [ ] Le format `idempotencyKey` Stripe est-il préservé ?

**Sécurité (cf. section 13)**
- [ ] Toute nouvelle route `/api/*` a-t-elle son check d'auth (`getStaffMember()` / `getAuthedTester()`) ?
- [ ] Toute nouvelle route prenant un email a-t-elle du rate-limiting (IP + email) ?
- [ ] Si la route révèle l'existence d'un compte (auth/recovery), retourne-t-elle `200` systématiquement (anti-énumération) ?
- [ ] Tout nouveau cron a-t-il son check `Bearer CRON_SECRET` + son guard d'idempotence (colonne DB ou state) ?
- [ ] Toute action sensible (NDA signé, paiement, suppression, changement de rôle, recovery) a-t-elle un `logStaffAction(...)` ?
- [ ] Toute nouvelle table sensible a-t-elle `ENABLE ROW LEVEL SECURITY` + politiques explicites ?
- [ ] Toute nouvelle RPC `SECURITY DEFINER` a-t-elle un `search_path` explicite + `REVOKE FROM PUBLIC` (cf. migration 023) ?

---

## 13. PLAYBOOK SÉCURITÉ

Cette section liste les patterns à suivre pour ne pas introduire de faille. Lire avant d'ajouter une route, un cron, une RPC ou une table.

### 13.1 Auth des routes API

**Staff** :
```typescript
const staff = await getStaffMember();
if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
const admin = createAdminClient();
if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
```

**Tester** :
```typescript
const authed = await getAuthedTester();
if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
```

**Cron** :
```typescript
const authHeader = request.headers.get("authorization");
const cronSecret = process.env.CRON_SECRET;
if (process.env.NODE_ENV === "production" && !cronSecret) {
  return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
}
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

> **RÈGLE** : Aucune nouvelle route `/api/*` sans le bon pattern. Pas d'exception "temporaire".

### 13.2 Rate-limiting

Toute route qui prend un email ou un identifiant utilisateur doit rate-limiter par **IP** ET par **email** :

```typescript
const ip = getClientIp(request);
const rlIp = rateLimit(`scope:ip:${ip}`, { windowMs: 60_000, max: 5 });
if (!rlIp.ok) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

const rlEmail = rateLimit(`scope:email:${emailNormalized}`, { windowMs: 60 * 60 * 1000, max: 3 });
if (!rlEmail.ok) return NextResponse.json({ success: true }); // anti-énumération
```

> **LIMITE CONNUE** : `lib/rate-limit.ts` est in-memory (cf. C15). En prod Vercel, chaque instance a son propre compteur. Acceptable pour anti-bot basique, insuffisant contre un attaquant motivé.

### 13.3 Anti-énumération (auth/recovery)

Routes concernées : `/api/staff/login/magic`, `/api/staff/forgot`, `/api/staff/recover-owner`, `/api/testers/login`, `/api/testers/register`.

```typescript
const { data: member } = await admin.from("staff_members").select("id").eq("email", email).maybeSingle();
if (!member) return NextResponse.json({ success: true }); // PAS 404
// ... génération + envoi email seulement si membre existe ...
return NextResponse.json({ success: true });
```

> **RÈGLE** : Réponse identique (statut + body + timing approximatif) que l'email existe ou non. Ne jamais ajouter `{ exists: true }` ou un statut différent.

### 13.4 Audit log immuable

Pour toute action sensible côté staff ou pouvant servir de preuve juridique :

```typescript
await logStaffAction(
  {
    staff_id: staff?.id ?? null,
    staff_email: staff?.email ?? "cron.<name>",
    action: "domain.action_verb",       // ex: "nda.signed_by_tester", "payout.pay"
    entity_type: "table_name",
    entity_id: row.id,
    metadata: { /* snapshot complet */ },
  },
  request, // capture ip + user_agent
);
```

Actions actuellement loguées (liste non exhaustive) :
- `nda.signed_by_tester` (signature, preuve juridique)
- `nda.reminder_batch` (cron)
- `project.testers_invited` (invitation auto)
- `project.midway_reminder_batch` (cron)
- `project.auto_close` (cron)
- `staff.setup_initial_admin` / `staff.setup_existing_user_promoted`
- `staff.password_recovery_requested` / `staff.password_recovery_started`
- `staff.magic_link_requested` / `staff.magic_link_login`
- `staff.recover_owner_used` / `staff.recover_owner_rejected`

> **RÈGLE** : `staff_audit_log` est append-only (cf. C18). Ne jamais ajouter d'UPDATE ou de DELETE sur cette table.

### 13.5 RLS — défense en profondeur

Toutes les tables sensibles ont `ENABLE ROW LEVEL SECURITY` + politiques `USING(false)` sur insert/update/delete (cf. C8). L'accès se fait via `service_role` (qui bypasse RLS) depuis les API.

**Quand on ajoute une table** :
```sql
ALTER TABLE public.<nouvelle_table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_select_service_role" ON public.<nouvelle_table>
  FOR SELECT USING (false);
CREATE POLICY "<table>_insert_service_role" ON public.<nouvelle_table>
  FOR INSERT WITH CHECK (false);
-- idem UPDATE / DELETE
```

> **RÈGLE** : Aucune nouvelle table sans RLS activée. Les policies `false` sont volontaires : elles bloquent tous les clients anon, seul `service_role` passe.

### 13.6 RPC SECURITY DEFINER — search_path obligatoire

Toute fonction PL/pgSQL `SECURITY DEFINER` (qui s'exécute avec les droits du propriétaire, ie. bypass RLS) DOIT :

```sql
ALTER FUNCTION public.<fn>(<args>) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.<fn>(<args>) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO service_role;
```

Cf. migration `023_lockdown_rpcs.sql` pour le pattern complet et la liste des RPCs verrouillées.

> **RÈGLE** : Sans `search_path` explicite, un attaquant qui contrôle un schéma modifiable peut faire exécuter du code arbitraire au contexte du propriétaire. C'est une faille critique.

### 13.7 Email-avant-DB sur routes critiques

Pour toute route qui envoie un email **et** modifie un statut (`nda/send`, `testers/invite`, etc.) :

1. Envoyer l'email
2. Si succès → faire la transition DB avec un filtre atomique (`.eq("status", "<previous>")`)
3. Si l'email échoue → retourner l'erreur sans toucher à la DB

```typescript
try { await sendEmail(...); }
catch (mailErr) {
  results.push({ id, success: false, error: "..." });
  continue;
}
const { data: updated } = await admin
  .from("project_testers")
  .update({ status: "nda_sent", nda_sent_at: nowIso })
  .eq("id", row.id)
  .eq("status", "selected") // garde atomique anti-race
  .select("id");
```

> **RÈGLE** : Ne jamais marquer une transition avant que l'email ne soit parti. Ne jamais omettre la garde `.eq("status", ...)` qui rend la transition idempotente.

### 13.8 Idempotence des crons

Tout cron qui produit un side effect (email, paiement, transition) doit avoir une **colonne d'idempotence** sur la table cible :
- `cron/nda-reminders` → `nda_reminder_sent_at`
- `cron/project-reminders` → `project_midway_reminder_sent_at`
- `cron/close-expired` → transition `active → closed` mono-directionnelle (pas de retour)

```typescript
// SELECT
.or(`reminder_sent_at.is.null,reminder_sent_at.lt.${cutoff}`)
// UPDATE après envoi réussi
.from("...").update({ reminder_sent_at: nowIso }).eq("id", row.id);
```

> **RÈGLE** : Si on relance un cron 2× le même jour (test, manual trigger, retry Vercel), aucun testeur ne doit recevoir l'email 2×.

### 13.9 Secrets et env vars sensibles

| Variable | Ne jamais... | Toujours... |
|----------|-------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | exposer côté client, logger | server-only, via `createAdminClient()` |
| `STAFF_SETUP_KEY` | committer, partager en clair | rotater après usage de recover-owner |
| `CRON_SECRET` | omettre en prod | définir avant tout déploiement |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | exposer, mocker en prod | vérifier signature webhook avec `stripe.webhooks.constructEvent` |
| `RESEND_API_KEY` | omettre silencieusement (`sendEmail` mock) | monitorer les envois (log côté Resend) |
| `OWNER_RECOVERY_KEY` | (déprécié, fusionné dans `STAFF_SETUP_KEY`) | — |

### 13.10 Bucket privé `documents`

Le bucket `documents` (NDA signés) doit toujours être en `public: false` :

```typescript
async function ensureDocumentsBucketPrivate(admin) {
  const { data: buckets } = await admin.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === "documents");
  if (!existing) {
    await admin.storage.createBucket("documents", { public: false });
    return;
  }
  if (existing.public) {
    await admin.storage.updateBucket("documents", { public: false });
  }
}
```

Les valeurs stockées en DB sous `nda_document_url` ont **deux formats coexistants** :
- `storage:ndas/<projectId>/<testerId>_<ts>.pdf` → résolution dynamique en URL signée 1h
- URL publique historique → retournée telle quelle (legacy, à migrer si possible)

> **RÈGLE** : Tout nouveau write dans `nda_document_url` doit utiliser le préfixe `storage:`. Ne jamais retourner un URL public depuis `/api/testers/documents`.

### 13.11 PKCE / OTP côté staff

Les routes `/staff/auth/callback` (et `/app/auth/callback`) implémentent à la fois :
- `exchangeCodeForSession(code)` (PKCE — flow magic link "natif" Supabase)
- `verifyOtp({ token_hash, type })` (lien custom envoyé via Resend avec `generateLink`)

Le callback staff fait en plus un **double check** :
1. Auth réussie ?
2. `app_metadata.role` ∈ {staff, admin} ? Sinon `signOut()` + redirect error
3. Ligne `staff_members` existe ? Sinon `signOut()` + redirect error

> **RÈGLE** : Ne jamais retirer ce double check. Un compte dont le rôle staff a été révoqué côté DB (mais dont le JWT est encore valide) ne doit pas pouvoir entrer.

### 13.12 Webhook signatures

`/api/webhooks/stripe` vérifie la signature avec `STRIPE_WEBHOOK_SECRET`. Tout autre webhook (Yousign si activé, etc.) doit suivre le même pattern :
1. Lire le body en raw (pas de parsing JSON avant)
2. Vérifier la signature
3. Idempotence par event ID (cf. `record_stripe_event` RPC)

> **RÈGLE** : Aucun webhook sans signature vérifiée. Aucun webhook sans idempotence par event ID.
