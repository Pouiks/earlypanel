# Sentry — guide d'installation pas-à-pas

> Doc interne. À supprimer ou archiver une fois Sentry configuré et stable.

Sentry est laissé optionnel pour cette passe : la pose des hooks dans `error.tsx` / `global-error.tsx` est déjà en place (cf. batch 3 — W5). Il reste à faire le setup compte + wizard pour activer la capture d'événements.

## Étape 1 — création du compte (manuel, hors code)

1. Aller sur <https://sentry.io/signup/> et créer un compte (free tier suffit pour démarrer : 5k events/mois, 30 jours de rétention).
2. Créer un nouveau projet de type **Next.js**.
3. Récupérer la **DSN** (format `https://xxx@oxxx.ingest.sentry.io/yyy`).
4. Aller dans **Settings → Auth Tokens** et créer un token avec les scopes :
   - `project:releases`
   - `org:read`
5. Récupérer le **slug d'organisation** (`SENTRY_ORG`) et le **slug de projet** (`SENTRY_PROJECT`).

## Étape 2 — variables d'environnement Vercel

Dans **Vercel → Project Settings → Environment Variables**, ajouter (Production + Preview) :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | la DSN récupérée à l'étape 1 |
| `SENTRY_AUTH_TOKEN` | le token de l'étape 1.4 |
| `SENTRY_ORG` | slug d'organisation |
| `SENTRY_PROJECT` | slug du projet |

Puis redéployer pour que les variables soient injectées.

## Étape 3 — installation du SDK

```bash
cd testpanel
npm install @sentry/nextjs
```

## Étape 4 — wizard officiel (recommandé)

```bash
npx @sentry/wizard@latest -i nextjs
```

Le wizard génère automatiquement :
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- modifications de `next.config.ts` (wrap avec `withSentryConfig`)
- `instrumentation.ts` (hooks Next.js 13+)

**Important** : après le wizard, **vérifier que `next.config.ts` conserve les `headers()` de M1**. Le wizard modifie le fichier ; il faut s'assurer que la fonction `headers()` est toujours retournée. Si elle a disparu, la replacer dans la config wrappée.

## Étape 5 — filtrage PII

Dans `sentry.client.config.ts` et `sentry.server.config.ts`, ajouter :

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Scrub email + cookies (RGPD).
    if (event.user?.email) event.user.email = "[REDACTED]";
    if (event.request?.cookies) event.request.cookies = { redacted: true };
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
    }
    return event;
  },
});
```

## Étape 6 — intégration dans error.tsx

Dans `src/app/error.tsx` et `src/app/global-error.tsx`, remplacer le `console.error` du `useEffect` par :

```ts
import * as Sentry from "@sentry/nextjs";

useEffect(() => {
  Sentry.captureException(error);
}, [error]);
```

## Étape 7 — vérification

1. Déployer une version sur Vercel preview.
2. Créer une route de test temporaire `src/app/api/_sentry-test/route.ts` :

```ts
export async function GET() {
  throw new Error("Sentry test event");
}
```

3. Appeler `https://<preview>.vercel.app/api/_sentry-test`.
4. Vérifier dans Sentry → Issues qu'un nouvel event est apparu (latence ≤ 30 sec).
5. Supprimer la route de test.

## Plan B — config manuelle (si le wizard pose problème)

1. Créer manuellement les 3 fichiers `sentry.{client,server,edge}.config.ts` avec un `Sentry.init()` minimal.
2. Wrapper `next.config.ts` :

```ts
import { withSentryConfig } from "@sentry/nextjs";
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
});
```

3. Pas besoin de `instrumentation.ts` en plan B (les configs `*.config.ts` suffisent pour la capture, pas pour le tracing distributed).

## Limitations free tier à connaître

- 5k events / mois → ajuster `tracesSampleRate: 0.1` (10% du trafic) ou moins.
- 30 jours de rétention.
- Pas de SSO/SAML, mais GitHub/Google login OK.
- Recommandé d'activer **Spike Protection** dans Settings pour éviter qu'un bug en boucle ne consomme tout le quota en quelques minutes.
