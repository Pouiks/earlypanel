# Workflow E2E — projet autonome en une commande

Trois entrées, zéro dépendance runtime (Node ≥ 18.17, fetch natif) :

```bash
npm run e2e:run       # parcours complet côté API (21 étapes assertées)
npm run e2e:journey   # parcours UTILISATEUR dans un vrai navigateur (Playwright)
npm run e2e:cleanup   # supprime TOUT en cascade + vérifie zéro reste
```

Si le serveur dev n'est pas sur le port 3000 :

```bash
npm run e2e:run     -- --base-url=http://localhost:3001
npm run e2e:journey -- --base-url=http://localhost:3001 --name="TESTE2E"
npm run e2e:cleanup -- --base-url=http://localhost:3001
```

`e2e:run` et `e2e:journey` créent les mêmes données taggées → **un seul**
`e2e:cleanup` nettoie ce que l'un OU l'autre a produit.

## Cycle de paiement fiabilisé (steps 19-24 de `e2e:run`)

Le run couvre le règlement des versements de bout en bout, sans Stripe réel :

- **0 € → refus** : un versement à 0 € ne peut pas devenir « payé » (reste `pending`, s'affiche « Aucun versement dû »).
- **Sans destination → refus** : jamais « payé » sans coordonnées de paiement.
- **Destination OK → « en cours »** : `payouts/pay` initie le transfert (réel ou **simulé** hors prod) et laisse le versement `pending` + `stripe_transfer_id`. `paid` n'est PAS posé ici.
- **Retour Stripe simulé** (`/payouts/simulate-stripe`, dev only) rejoue la logique du vrai webhook : `paid` → payé + `total_earned` crédité (ledger idempotent) ; re-simuler ne recrédite pas ; `reversed` → `failed` + crédit annulé.

Voir le contrat **C24** dans `PROJECT_CONTEXT.md`. En prod, câbler le vrai webhook Stripe (`transfer.paid/failed/reversed`) — la logique est déjà en place dans [`src/lib/payout-settlement.ts`](../../src/lib/payout-settlement.ts).

## `e2e:journey` — parcours utilisateur via l'UI (Playwright)

Reproduit ce qu'un testeur vit **dans un vrai Chromium**, écran par écran :
inscription sur `/testeurs` → clic sur le magic link → onboarding 5 étapes
(formulaires réels remplis au clavier) → tour guidé → dashboard →
**signature du NDA** (modale de confirmation) → **démarrage mission**
(modale) → **réponses aux 3 questions** (textarea / boutons Oui-Non /
échelle 1-5, avec auto-save) → **soumission** (modale) → mission
« Complétée » → gains. Les actions staff (assignation, envoi NDA,
notation, payout, clôture) passent par l'API en arrière-plan, comme dans
la réalité.

Chaque étape produit une **capture d'écran** dans
`scripts/e2e/.screenshots/<runId>/` (gitignoré). Options :

```bash
--headed        # voir le navigateur (sinon headless)
--slow=250      # ralentir chaque action de 250ms (démo)
--name="..."    # nom du projet (le préfixe [E2E TEST] reste imposé)
```

### Prérequis

```bash
npm install -D playwright        # déjà dans devDependencies
npx playwright install chromium  # une fois, télécharge le navigateur
```

### Important : cohérence `NEXT_PUBLIC_APP_URL` ↔ port

Les routes financières / de soumission vérifient l'`Origin` (CSRF,
`src/lib/csrf.ts`). En prod c'est strict. **En dev**, si `NODE_ENV` n'est
pas `production`, l'absence de header passe — mais un navigateur envoie
toujours `Origin`. Donc si le serveur tourne sur `:3001` alors que
`NEXT_PUBLIC_APP_URL=http://localhost:3000`, la soumission de mission est
refusée (`403 Origine non autorisée`). **Lancez le serveur avec un
`NEXT_PUBLIC_APP_URL` qui matche le port réel** :

```bash
# PowerShell
$env:PORT='3001'; $env:NEXT_PUBLIC_APP_URL='http://localhost:3001'; npm run dev
```

### Finding ouvert : le tour guidé ne s'affiche pas de façon fiable

Pour un testeur fraîchement activé, le tour driver.js n'apparaît pas
systématiquement (le script le tolère et poursuit). Cause probable :
dans `src/app/app/dashboard/layout.tsx`, les callbacks `onComplete`/`onSkip`
passés à `OnboardingTour` sont recréés à chaque render ; l'effet
d'initialisation de `OnboardingTour.tsx` (deps `[onComplete, onSkip]`)
reconstruit alors le driver à chaque re-render du dashboard (fetch tester,
notifications, toasts, polling), tandis que le `.drive()` one-shot n'est
déclenché qu'une fois. Le driver reconstruit ne reçoit jamais son
`.drive()`. Fix suggéré : `useCallback` sur les deux callbacks (ou retirer
ces deps de l'effet d'init). **Non corrigé ici** (hors périmètre).

## Ce que `e2e:run` déroule (via les vraies routes API)

1. Preflight `/api/health`
2. Staff E2E : bootstrap (`/api/staff/setup`, dev only) + login magic link
3. Client B2B → projet (draft) → scénario (use case + 2 critères + 3 questions text/binary/scale) → NDA
4. Testeur : inscription réelle (`/api/testers/register`) → login magic link → onboarding 5 étapes → activation par trigger DB
5. Assignation → envoi NDA (projet passe `active`) → signature NDA (PDF + hash) → start → réponses → submit
6. Complétion des critères → notation 4★ → payout `pending` 22,00 € (2000 × 1,1)
7. Paiement : refus propre sans Stripe, puis chemin `montant ≤ 0` jusqu'à `paid`
8. Audit log (7 actions sensibles) + événements de score (+5 / +10)

Chaque étape est assertée (statuts, montants, événements). **Exit 1 au
premier échec** → utilisable tel quel en CI ou en hook pre-commit.

## Garde-fous — testeurs réels en base

La DB Supabase est **la prod** (pas de projet de dev séparé) et contient
des testeurs réels. Le script **refuse de démarrer** si `SKIP_EMAILS=true`
n'est pas dans `.env.local` (interception de tous les mails, magic link
imprimé dans la console du serveur dev). Il refuse aussi toute URL non
locale sans `--allow-remote`.

Toutes les données créées sont taggées pour le cleanup déterministe :
- projets / clients : titre préfixé `[E2E TEST]`
- testeurs / staff : email en `@e2e.earlypanel.test`

## Ce que `e2e:cleanup` supprime

1. Fichiers storage (PDF NDA signés, images mission) des projets E2E
2. Projets `[E2E TEST]%` + testeurs `@e2e.earlypanel.test` + auth users
   (via `POST /api/admin/cleanup-demo`, fallback REST direct si serveur down)
3. Clients B2B `[E2E TEST]%`
4. Staff E2E (`staff_members` + auth user)

Puis re-vérifie qu'il ne reste **rien** (exit 1 sinon). Seules les entrées
`staff_audit_log` restent — append-only par design (preuve immuable, C18).

## Pièges connus

- `/api/testers/register` est rate-limité **5/h par IP** : au-delà de
  5 runs dans l'heure, l'étape 08 renvoie 429.
- Le score qualité est **borné à 100** par le trigger
  `recalculate_tester_tier` : un testeur neuf (score 100) ne monte pas à
  105 après soumission. On vérifie donc les `tester_score_events`, pas
  l'incrément.
- Le transfert Stripe réel n'est **pas** couvert (pas de clé locale, pas
  de compte Connect sur le testeur E2E) : le script valide le refus
  propre et le chemin `paid` à montant nul. Pour couvrir Stripe, utiliser
  une clé test + un compte Connect de test.
