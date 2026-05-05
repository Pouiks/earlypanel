# Règles pour `src/app/api/webhooks/*`

Webhooks externes (Stripe, Yousign si activé). Auth via signature cryptographique, pas via cookie.

## 1. Body en raw — JAMAIS de JSON parsing avant signature check

```typescript
export async function POST(request: NextRequest) {
  const body = await request.text(); // ← raw, surtout PAS request.json()
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Maintenant seulement on peut faire confiance au payload
  const data = event.data;
}
```

**Pourquoi** : Stripe (et tous les webhooks signés) calculent la signature sur le **body brut**. Si Next parse en JSON, l'ordre des clés et le whitespace changent → signature invalide.

## 2. Idempotence par event ID

Stripe peut rejouer un webhook (timeout, retry). Sans idempotence, un `payment_intent.succeeded` rejoué crédite 2× le compte.

```typescript
// Pattern via RPC SECURITY DEFINER
const { data: alreadyProcessed } = await admin.rpc("record_stripe_event", {
  p_event_id: event.id,
  p_event_type: event.type,
});

if (alreadyProcessed === false) {
  // Event déjà traité, on retourne 200 sans rien refaire.
  return NextResponse.json({ received: true, deduped: true });
}

// Sinon : process l'event
```

La RPC `record_stripe_event` doit insérer dans `stripe_events_processed (event_id PRIMARY KEY)` et retourner `true` si nouveau, `false` si déjà connu (`ON CONFLICT DO NOTHING`).

## 3. Réponse rapide (Stripe timeout = 20s)

- Toute opération longue (envoi email, génération PDF) → soit en background (Vercel Edge), soit accepter et faire en async.
- Toujours retourner **200** dès que la signature est valide et l'event enregistré, même si le traitement métier échoue (sinon Stripe retry).
- Erreurs métier → **logguer + audit log**, pas de 500 vers Stripe.

## 4. Secret dédié par webhook

| Webhook | Secret env | Usage |
|---|---|---|
| Stripe | `STRIPE_WEBHOOK_SECRET` | `stripe.webhooks.constructEvent` |
| Yousign (si activé) | `YOUSIGN_WEBHOOK_SECRET` | HMAC-SHA256 manual |

**Jamais** réutiliser un secret entre 2 webhooks.

## 5. Audit log systématique

```typescript
await logStaffAction({
  staff_id: null,
  staff_email: "system@webhook",
  action: `stripe.${event.type}`,
  entity_type: "stripe_event",
  entity_id: event.id,
  metadata: { livemode: event.livemode, created: event.created },
}, request);
```

## 6. Configuration Next pour webhooks

```typescript
// route.ts
export const runtime = "nodejs"; // Edge ne supporte pas tout (raw body crypto)
export const dynamic = "force-dynamic"; // pas de cache
```

## Checklist avant PR

- [ ] Body lu en `request.text()`, pas `request.json()`
- [ ] Signature vérifiée via secret dédié AVANT toute logique
- [ ] Idempotence par event ID (RPC `record_stripe_event` ou équivalent)
- [ ] Retour 200 rapide après signature OK
- [ ] Audit log avec event ID + type
- [ ] `runtime = "nodejs"`, `dynamic = "force-dynamic"`
- [ ] Test manuel : rejouer le même event 2× → 2e fois `deduped: true`
