# Tests — earlypanel

Stratégie de tests pour prévenir les régressions sur les zones critiques (financier, juridique, sécurité).

## Stack

- **Vitest** — runner de tests unitaires (rapide, support TS natif, alias `@/` configuré)
- **GitHub Actions** — CI sur push et PR
- **Phase suivante (non encore implémentée)** : Playwright (E2E), tests "guards" (cohérence code ↔ CLAUDE.md), smoke post-deploy

## Commandes

```bash
npm test              # Lance tous les tests une fois (mode CI, fail-fast)
npm run test:watch    # Mode dev : relance auto à chaque sauvegarde
npm run test:ui       # UI Vitest dans le navigateur (filtres, debug visuel)
```

Une exécution complète prend < 1 seconde (125 tests actuellement).

## Organisation des fichiers

```
tests/
├── CLAUDE.md                          # Ce fichier
└── unit/
    ├── iban.test.ts                   # 43 tests : validation IBAN MOD-97-10
    ├── reward-calculator.test.ts      # 20 tests : calcul rémunération + tier + rating
    ├── junk-detection.test.ts         # 43 tests : détection saisies poubelles
    ├── tester-cgu.test.ts             # 7 tests  : version + hash CGU
    └── rate-limit.test.ts             # 12 tests : rate-limit IP + email
```

**Convention** : `tests/unit/<nom-du-fichier-source>.test.ts`. Un fichier de test par fichier de `src/lib/`.

## Quand ajouter un test

| Cas | Type de test | Où |
|---|---|---|
| Nouveau helper dans `src/lib/` | Unit (Vitest) | `tests/unit/<nom>.test.ts` |
| Modification d'un helper critique (iban, reward, cgu) | Compléter le fichier de test existant | idem |
| Nouvelle route API | (Phase suivante : intégration) | — |
| Nouveau composant React avec logique | (Optionnel, Vitest + jsdom) | `tests/unit/<composant>.test.tsx` |
| Nouveau cron / migration / RPC | (Phase suivante : E2E ou smoke) | — |

**Règle** : si le code touche aux **conventions cents/euros**, à un **IBAN**, à la **CGU**, au **rate-limit**, ou à la **logique de paiement**, **un test est obligatoire**.

## CI GitHub Actions

Workflow : [`.github/workflows/test.yml`](../.github/workflows/test.yml)

**Quand la CI tourne** :

| Action | CI tourne ? |
|---|---|
| Push sur `main` | ✅ Oui |
| Push sur n'importe quelle branche (ex: `feature/xyz`) | ✅ Oui |
| PR ouverte/mise à jour vers `main` | ✅ Oui |
| Push sur branches `dependabot/**` ou `renovate/**` | ❌ Non (PR auto créera son propre run) |

**La CI ne bloque RIEN par défaut**. Elle affiche juste ✅ ou ❌ à côté du commit / de la PR. Pour bloquer un merge sur tests rouges, configurer Branch Protection sur `main` côté GitHub Settings.

**Ce que la CI fait** :
1. Setup Node.js 20 + cache `npm`
2. `npm ci` (install strict via `package-lock.json`)
3. `npm test` (exécute Vitest avec `CI=true`)

**Ce que la CI ne fait PAS** (volontairement, à corriger plus tard) :
- ❌ `npm run typecheck` (échoue sur `.next/types/validator.ts` stale, bug Next pré-existant)
- ❌ `npm run lint` (échoue sur `useTypewriter.ts` et `PreLaunchBanner.tsx`, hooks legacy à nettoyer)

Quand le legacy sera nettoyé, réintégrer les deux lignes dans `.github/workflows/test.yml`.

## Comment écrire un bon test

### 1. Tester le contrat, pas l'implémentation

```typescript
// ✅ Bien : teste l'API publique
expect(validateIban("FR1420041010050500013M02606").valid).toBe(true);

// ❌ Mal : teste un détail interne
expect(mod97Check("...")).toBe(true); // mod97Check n'est pas exporté
```

### 2. Couvrir les invariants critiques

Pour `reward-calculator`, ne pas seulement tester *"100 + rating 5 = 110"*, mais aussi :
- Le résultat est **toujours un entier** (pas de centimes flottants)
- Le résultat est **toujours ≥ 0** (jamais de paiement négatif)
- Le tier override **prend le pas** sur la base si défini

### 3. Tester les faux positifs autant que les vrais positifs

Pour `junk-detection`, on teste que `"azerty"` est rejeté ✅, mais aussi que `"Le"`, `"Vu"`, `"D'Aubigne"` sont **acceptés** — sinon on bloque des vrais utilisateurs.

### 4. Utiliser `vi.useFakeTimers()` pour les tests temporels

```typescript
import { vi } from "vitest";

it("reset apres windowMs", () => {
  vi.useFakeTimers();
  // ...
  vi.advanceTimersByTime(1500);
  // ...
  vi.useRealTimers();
});
```

### 5. Cleanup obligatoire pour le rate-limit

```typescript
beforeEach(() => {
  _resetRateLimitBuckets(); // sinon les tests se polluent entre eux
});
```

## Ce que les tests catchent (cas réels)

| Régression possible | Test qui catch |
|---|---|
| Modifier la grille rating (5→x1.10 devient x1.05) | `reward-calculator.test.ts` ligne ~85 |
| Ajouter un IBAN d'un pays non-SEPA dans la whitelist | `iban.test.ts` "rejette un pays non supporte" |
| Changer le texte CGU sans bumper `CGU_VERSION` | `tester-cgu.test.ts` (format version) |
| Ajouter "Le" à JUNK_WORDS par erreur | `junk-detection.test.ts` cas "Le" |
| Casser le décompte rate-limit en passant max+1 | `rate-limit.test.ts` "bloque la requete au-dela de max" |
| Convertir `total_earned` en cents au lieu d'euros | `reward-calculator.test.ts` `centsToEuros` |

## Ce que les tests NE catchent PAS (pour le moment)

- 🚫 Bugs de DB (RLS mal configurée, RPC sans search_path → bug 033)
- 🚫 Bugs d'auth (route sans `getStaffMember()`)
- 🚫 Bugs E2E (parcours d'inscription cassé en UI)
- 🚫 Bugs de cron (envoi email 2× car pas d'idempotence)
- 🚫 Bugs Stripe webhook (signature non vérifiée)

→ Ces classes de bugs seront couvertes par **Phase 2 (tests guards)** et **Phase 3 (Playwright + Supabase test branch)**, pas encore implémentées.

## Évolutions prévues

- [ ] **Phase 2** : tests "guards" qui scannent le code et vérifient la cohérence avec les CLAUDE.md (ex: "toute route API a un check d'auth", "toute migration RPC SECURITY DEFINER a `extensions` dans search_path")
- [ ] **Phase 3** : Playwright + projet Supabase test dédié pour E2E (inscription, login, création projet, NDA, paiement)
- [ ] **Phase 4** : smoke script post-deploy (POST IBAN test, login, export CSV) — aurait catché le bug 033 en 30s
- [ ] **Cleanup legacy** : fixer les `react-hooks/set-state-in-effect` puis réintégrer `npm run lint` dans la CI
- [ ] **Typecheck CI** : créer `tsconfig.test.json` qui exclut `.next/types/` ou réintégrer typecheck après `npm run build`

## Pour ajouter un test rapidement

1. Créer `tests/unit/<nom>.test.ts`
2. Importer la fonction depuis `@/lib/<nom>`
3. Écrire les `describe` / `it` avec patterns ci-dessus
4. `npm run test:watch` → vérifier que ça passe vert
5. Commit
