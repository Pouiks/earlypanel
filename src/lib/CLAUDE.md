# Règles pour `src/lib/*`

Ce dossier contient la **logique métier pure** : utilitaires, helpers, validations. Code partagé entre routes API et composants.

## Règles non-négociables

### 1. Pure functions only

- **Pas de side effects** dans les fonctions exportées (pas de `console.log`, pas de fetch, pas d'appel DB direct).
- Si une fonction a besoin d'un client Supabase, **passer le client en paramètre**. Jamais l'instancier dedans.
- Si un helper a besoin de `Date.now()` ou d'une génération aléatoire, OK mais **toujours déterministe pour les tests** (les tests utilisent `vi.useFakeTimers()`).

### 2. Conventions monétaires (BUG #15)

| Colonne DB | Unité |
|---|---|
| `tester_payouts.calculated_amount_cents` | **CENTIMES** (INTEGER) |
| `tester_payouts.final_amount_cents` | **CENTIMES** (INTEGER) |
| `projects.base_reward_cents` | **CENTIMES** (INTEGER) |
| `projects.tier_rewards.{standard,expert,premium}` | **CENTIMES** (INTEGER) |
| `testers.total_earned` | **EUROS** (NUMERIC décimale) ⚠️ |

`testers.total_earned` est en EUROS par convention historique. **Toujours convertir avec `centsToEuros()`** avant d'incrémenter.

Ne jamais multiplier deux montants sans documenter l'unité dans le nom (`amount_cents`, pas `amount`).

### 3. IBAN : passer par les helpers `lib/iban.ts`

- **Toute saisie IBAN** passe par `normalizeIban()` AVANT validation ou stockage.
- **Toute validation IBAN** passe par `validateIban()` (MOD-97-10 + whitelist pays SEPA+UK+CH).
- **Jamais d'IBAN clair en log, en cookie, en localStorage**. Stocker uniquement `last4` côté client.
- Le chiffrement complet de l'IBAN passe par la RPC `upsert_tester_payment_info` (pgcrypto côté DB).

### 4. Règle CGU (`tester-cgu.ts`)

- Toute modification du `CGU_TEXT` **DOIT** s'accompagner d'un bump de `CGU_VERSION` (format `vMAJOR.MINOR-YYYY-MM`).
- Le hash SHA-256 du texte est stocké lors de la signature → preuve juridique. Modifier le texte sans bumper la version invalide rétroactivement les signatures précédentes.
- Test garde-fou : `tests/unit/tester-cgu.test.ts` vérifie le format de la version et la présence des sections RGPD/DAS-2/SEPA/eIDAS.

### 5. Junk detection (`junk-detection.ts`)

- `JUNK_WORDS` et `KEYBOARD_SEQUENCES` sont volontairement français + ASCII.
- Avant d'ajouter un mot, vérifier qu'il ne crée pas de **faux positif** sur des noms réels (ex: "Le", "Vu", "Ng" sont des noms valides).
- Toujours tester via `tests/unit/junk-detection.test.ts` avant commit.

### 6. Rate-limit (`rate-limit.ts`)

- In-memory only (per Vercel instance). **Limite connue** : un attaquant motivé peut contourner via N instances. C'est OK pour anti-abus basique, pas pour anti-DDoS.
- Convention projet : **5/min par IP**, **3/h par email** sur les routes auth.
- Toujours appeler `_resetRateLimitBuckets()` dans `beforeEach` des tests.

### 7. Auth helpers (`staff-auth.ts`, `tester-auth.ts`)

- Wrappés dans `React.cache()` → 1 seul appel par requête HTTP même si appelés 10 fois.
- **Ne jamais** copier-coller leur code dans une route. Toujours appeler le helper.
- `null` retourné = utilisateur non authentifié → la route DOIT retourner 401.

## Tests

- Toute nouvelle fonction exportée dans `lib/` doit avoir un test unitaire (`tests/unit/<fichier>.test.ts`).
- Coverage cible : **100% sur les chemins métier critiques** (iban, reward, junk, cgu, rate-limit). Pas obligatoire sur les helpers triviaux (formatters d'affichage).
- Lancer `npm test` avant tout commit qui touche `lib/`.

## Dépendances autorisées

- ✅ `node:crypto`, `next/server` (types only), Supabase types
- ❌ `react`, `next/headers`, `next/navigation` (sauf dans les fichiers `*-auth.ts` qui en ont besoin)
- ❌ `fetch` direct (utiliser un client typé)
