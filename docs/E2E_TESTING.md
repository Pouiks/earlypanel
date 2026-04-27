# Mode test E2E manuel — earlypanel

Ce document décrit comment tester un parcours testeur complet de bout en bout, sans risquer la prod, via les endpoints `/api/admin/seed-demo` et `/api/admin/cleanup-demo`.

## Quand l'utiliser

- Tester un changement de code en bout en bout dans un vrai navigateur
- Vérifier qu'un nouveau flow (invitation, NDA, mission, payout) fonctionne
- Reproduire un bug reporté avec des données fraîches
- Démontrer le produit à un investisseur / client sans polluer la vraie DB

**Ne pas l'utiliser pour** : remplacer Stripe test mode (les paiements seront tentés en prod), tester la délivrabilité email (Resend va bouncer sur `@e2e.earlypanel.test`).

## Tagging

Les données seedées sont identifiables par :
- **Projet** : `title LIKE '[E2E TEST]%'`
- **Testeur** : `email LIKE '%@e2e.earlypanel.test'` (sauf si `custom_email` passé)
- **Auth user** : `app_metadata.e2e_seed = true`

Le cleanup script supprime tout ce qui matche ces patterns. Tu ne peux pas confondre avec de vraies données.

## 1. Seeder un parcours

### Cas A : tester avec un email fictif (rapide, pas d'email réel reçu)

```bash
curl -X POST https://earlypanel.fr/api/admin/seed-demo \
  -H "Content-Type: application/json" \
  -d '{"setup_key":"<TA_STAFF_SETUP_KEY>"}'
```

Réponse :
```json
{
  "success": true,
  "tester": {
    "id": "uuid",
    "email": "e2e-abc123@e2e.earlypanel.test",
    "password": "16chars",
    "login_url": "https://earlypanel.fr/app/login"
  },
  "project": {
    "id": "uuid",
    "title": "[E2E TEST] Demo Project abc123",
    "staff_url": "https://earlypanel.fr/staff/dashboard/projects/<id>"
  }
}
```

### Cas B : recevoir réellement les emails (recommandé pour tester le flow complet)

```bash
curl -X POST https://earlypanel.fr/api/admin/seed-demo \
  -H "Content-Type: application/json" \
  -d '{"setup_key":"<TA_STAFF_SETUP_KEY>","custom_email":"toi+e2e@gmail.com"}'
```

Tu reçois les emails NDA / relance / post-signature à `toi+e2e@gmail.com` (Gmail accepte le `+alias`). **Important** : note le password retourné, il ne sera jamais réaffiché.

## 2. Parcours de test recommandé

Une fois le seed fait :

1. **Login tester** :
   - Va sur `login_url` (mode mot de passe)
   - Email + password retournés par le seed
   - Tu arrives sur `/app/dashboard` (le profil est déjà 100% complet)

2. **Login staff** (autre navigateur ou onglet incognito) :
   - Va sur `/staff/login` avec ton compte admin
   - Ouvre `staff_url` du projet créé
   - Onglet **Testeurs** → tu vois le testeur seedé dans la liste (filtre "actifs", profile_completed=true)

3. **Inviter le testeur** :
   - Coche le testeur seed → "Inviter"
   - L'API `testers/invite` envoie le NDA et passe le projet en `active`
   - Email NDA part vers l'adresse du testeur

4. **Signer le NDA** (côté tester) :
   - Refresh `/app/dashboard` → badge "Mes documents" affiche `1`
   - Clique sur le NDA → signature
   - Email post-signature reçu (`Démarrer la mission`)
   - Audit log : entrée `nda.signed_by_tester` dans `staff_audit_log` avec hash, IP, UA

5. **Démarrer la mission** :
   - Va sur `/app/dashboard/missions` → mission active visible
   - Démarre, réponds à la question seed, soumets

6. **Noter** (côté staff) :
   - Refresh le projet → onglet **Réponses** → la réponse est visible
   - Note le testeur (1-5 étoiles) → un payout est créé en `pending`

7. **Tester le cron de relance** (optionnel) :
   - Modifie temporairement `nda_sent_at` à `now() - 4 days` via SQL
   - Lance manuellement `GET /api/cron/nda-reminders` avec le `Authorization: Bearer <CRON_SECRET>`
   - Email de relance envoyé

## 3. Cleanup complet

```bash
curl -X POST https://earlypanel.fr/api/admin/cleanup-demo \
  -H "Content-Type: application/json" \
  -d '{"setup_key":"<TA_STAFF_SETUP_KEY>"}'
```

Réponse :
```json
{
  "success": true,
  "deleted": {
    "projects": 1,
    "testers": 1,
    "auth_users": 1
  }
}
```

**Limite** : si tu as utilisé `custom_email` avec ta vraie adresse, le cleanup **ne supprime pas** automatiquement le tester (parce que son email ne matche pas le domaine `@e2e.earlypanel.test`). Pour le retirer, soit :
- Modifie d'abord son email en SQL : `UPDATE testers SET email = 'e2e-manual@e2e.earlypanel.test' WHERE email = 'toi+e2e@gmail.com'` puis relance cleanup
- Ou utilise [`supabase/scripts/cleanup_non_whitelist_testers.sql`](../supabase/scripts/cleanup_non_whitelist_testers.sql) ciblé sur cet email

## 4. Sécurité

- Endpoints protégés par `STAFF_SETUP_KEY` (même clé que `/api/staff/setup` et `/api/staff/recover-owner`)
- Toute exécution réussie ou rejetée est loguée dans `staff_audit_log` :
  - `demo.seed_created` / `demo.seed_rejected`
  - `demo.cleanup_executed` / `demo.cleanup_rejected`
- Cleanup défensif : ne supprime jamais un `auth.users` qui est aussi `staff_members`
- Idempotent : tu peux seeder plusieurs fois (chaque seed crée des objets distincts), cleanup les supprime tous

## 5. Limites connues

- Pas d'isolation Stripe : si tu testes le flow payout, ça tente un transfert réel. Désactive `STRIPE_SECRET_KEY` ou utilise des comptes Stripe de test pour ces tests.
- Pas d'isolation Resend : les emails partent vraiment (vers `@e2e.earlypanel.test` qui bounce, sauf si tu mets ton vrai email)
- Pas de capture d'écran ni de validation automatique : c'est du test **manuel**. Pour de la régression continue, voir l'éventuel futur setup Playwright (non implémenté à ce jour).
