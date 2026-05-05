# Règles pour `src/app/api/cron/*`

Crons Vercel programmés (cf. `vercel.json`). Tournent sans session utilisateur.

## 1. Auth fail-closed via Bearer token

```typescript
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    // Garde-fou : en prod sans CRON_SECRET, on REFUSE de tourner.
    return NextResponse.json({ error: "Cron secret missing" }, { status: 500 });
  }
  // ... suite
}
```

**Jamais** :
- Pas d'auth sur un cron
- Auth via header custom non-cryptographique
- `CRON_SECRET` hardcodé, loggué, exposé côté client

## 2. Idempotence obligatoire

Tout cron qui produit un side effect (email, paiement, transition DB) **DOIT** avoir une garde d'idempotence. Vercel peut rejouer un cron 2× consécutivement (timeout, retry).

### Patterns acceptés

| Pattern | Exemple | Garantie |
|---|---|---|
| **Cooldown** | `WHERE nda_reminder_sent_at < now() - interval '3 days'` | Pas plus d'1 envoi par testeur tous les 3j |
| **One-shot** | `WHERE project_midway_reminder_sent_at IS NULL` | Pas plus d'1 envoi par projet, jamais |
| **Mono-direction** | `UPDATE projects SET status='closed' WHERE status='active' AND ...` | Transition non répétable |

### Anti-pattern (à NE JAMAIS faire)

```typescript
// ❌ Pas de garde : un retry envoie l'email 2×
const testers = await admin.from("testers").select().eq("nda_status", "pending");
for (const t of testers) {
  await sendNdaReminder(t.email);
}
```

```typescript
// ✅ Avec cooldown
const testers = await admin
  .from("testers")
  .select()
  .eq("nda_status", "pending")
  .or(`nda_reminder_sent_at.is.null,nda_reminder_sent_at.lt.${threeDaysAgo}`);

for (const t of testers) {
  await sendNdaReminder(t.email);
  await admin
    .from("testers")
    .update({ nda_reminder_sent_at: new Date().toISOString() })
    .eq("id", t.id);
}
```

**Ordre crucial** : `UPDATE` de la colonne d'idempotence **APRÈS** l'envoi réussi, dans la même boucle. Sinon : email échoue, colonne mise à jour quand même → user n'est plus relancé.

## 3. Logging structuré

Chaque cron termine avec un résumé :

```typescript
return NextResponse.json({
  ok: true,
  processed: testers.length,
  sent: successCount,
  errors: errorCount,
});
```

Vercel logs cette réponse → debugging post-incident facile.

## 4. Audit log

Si l'action a un impact financier ou juridique (envoi NDA, fermeture projet, paiement) :

```typescript
await logStaffAction({
  staff_id: null, // cron, pas un humain
  staff_email: "system@cron",
  action: "nda_reminder_sent",
  entity_type: "tester",
  entity_id: t.id,
  metadata: { cron: "nda-reminders", reminded_at: new Date().toISOString() },
}, request);
```

## Crons existants

| Cron | Schedule | Idempotence |
|---|---|---|
| `/api/cron/close-expired` | quotidien | Mono-direction `active → closed` |
| `/api/cron/daily-reminders` | quotidien | Cooldown email 24h |
| `/api/cron/nda-reminders` | quotidien | Cooldown 3j (`nda_reminder_sent_at`) |
| `/api/cron/project-reminders` | quotidien | One-shot `project_midway_reminder_sent_at` |

## Checklist avant PR

- [ ] `Authorization: Bearer ${CRON_SECRET}` en première ligne
- [ ] Garde fail-closed si `CRON_SECRET` absent en prod
- [ ] Garde d'idempotence (cooldown / one-shot / mono-direction)
- [ ] `UPDATE` de la colonne d'idempotence APRÈS l'envoi
- [ ] Réponse JSON avec compteurs (`processed`, `sent`, `errors`)
- [ ] Si action sensible : `logStaffAction(...)`
- [ ] Tester en lançant 2× consécutivement → 0 effet la 2e fois
