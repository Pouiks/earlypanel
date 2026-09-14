import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  pauseAfterReminders,
  selectCampaignCandidates,
  sendAvailabilityCampaign,
  summarizeCampaign,
} from "@/lib/availability-campaign";
import { engagementState, reminderCount, shouldAutoRemind, shouldPauseAfterReminders } from "@/lib/tester-engagement";

const log = logger("cron/availability-campaign");

export const runtime = "nodejs";
// Envoi sequentiel throttle (~2,5 mails/s) : BATCH_LIMIT x 0,4 s doit tenir
// dans maxDuration. 100 mails = 40 s.
export const maxDuration = 60;

// Cron hebdomadaire : boucle de relance « etes-vous toujours disponible ? »
// pour les testeurs actifs au profil complet SANS disponibilite confirmee.
//
// Cadence (src/lib/tester-engagement.ts), calquee sur la relance profil :
//   - relance des que le cooldown de 14 j depuis la derniere est ecoule,
//     3 relances max ; la 3e annonce la pause ;
//   - 14 j apres la 3e sans reponse : status active -> inactive (pause).
//     Reversible : « Oui » depuis l'email ou l'espace testeur remet actif et
//     le compteur a zero.
//
// Idempotence : `availability_check_sent_at` + `availability_check_count`
// ecrits APRES l'envoi reussi, dans la boucle ; l'erreur d'ecriture est
// comptee (`unmarked`) et journalisee. La pause est une transition
// mono-directionnelle avec filtre atomique sur le statut precedent.
//
// Parametres de test :
//   ?dry_run=1  : aucun email, aucune ecriture ; renvoie les cibles
//   ?limit=N    : borne le nombre d'emails de ce passage (max BATCH_LIMIT)

const BATCH_LIMIT = 100;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/availability-campaign] CRON_SECRET manquant en production");
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = ["1", "true"].includes(url.searchParams.get("dry_run") ?? "");
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, BATCH_LIMIT) : BATCH_LIMIT;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });

  const now = new Date();
  const { data: candidates, error } = await selectCampaignCandidates(admin, { now });
  if (error) return NextResponse.json({ error }, { status: 500 });

  const all = candidates ?? [];
  const targets = all.filter((t) => shouldAutoRemind(t, now));
  const toPause = all.filter((t) => shouldPauseAfterReminders(t, now));
  const batch = targets.slice(0, limit);
  const remaining = Math.max(0, targets.length - batch.length);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      candidates: all.length,
      targets: targets.length,
      to_pause: toPause.length,
      remaining_after_batch: remaining,
      batch: batch.map((t) => ({ id: t.id, email: t.email, state: engagementState(t, now), reminder_no: reminderCount(t) + 1 })),
      pause: toPause.map((t) => ({ id: t.id, email: t.email })),
    });
  }

  const results = await sendAvailabilityCampaign(admin, { recipients: batch, appUrl, now });
  const summary = summarizeCampaign(results);
  const pause = await pauseAfterReminders(admin, toPause, now);

  if (summary.unmarked > 0) {
    log.error("marquage availability_check_sent_at echoue", { unmarked: summary.unmarked });
  }

  const metadata = {
    ...summary,
    candidates: all.length,
    targets: targets.length,
    remaining_after_batch: remaining,
    paused: pause.paused.length,
    pause_errors: pause.errors,
  };

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.availability-campaign",
    action: "availability_campaign.cron",
    entity_type: "tester",
    metadata,
  });

  log.info("campagne envoyee", { sent: summary.sent, total: summary.total, unmarked: summary.unmarked, paused: pause.paused.length });

  return NextResponse.json(metadata);
}
