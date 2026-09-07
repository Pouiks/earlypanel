import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import {
  PROFILE_REMINDER_AFTER_DAYS,
  PROFILE_REMINDER_COOLDOWN_DAYS,
  PROFILE_REMINDER_MAX,
  sendProfileReminder,
} from "@/lib/profile-reminder";

const log = logger("cron/profile-reminders");

export const runtime = "nodejs";

// Cron : relance les testeurs inscrits (status='pending') dont le profil
// n'est pas complet, avec un magic link vers l'onboarding.
//
// Cadence anti-spam (reputation du domaine) :
//   - 1re relance PROFILE_REMINDER_AFTER_DAYS apres l'inscription
//   - puis une relance tous les PROFILE_REMINDER_COOLDOWN_DAYS, jamais plus
//   - PROFILE_REMINDER_MAX relances au total ; la derniere annonce la pause
//   - PROFILE_REMINDER_COOLDOWN_DAYS apres la derniere relance sans reponse,
//     le testeur passe en status='inactive' (pas dispo). Reversible : s'il
//     complete son onboarding plus tard, il repasse pending puis active.
//
// Idempotence : `profile_reminder_sent_at` (cooldown) + `profile_reminder_count`
// (plafond), mis a jour APRES l'envoi reussi ; la mise en pause est une
// transition mono-directionnelle pending -> inactive.
//
// Parametres de test :
//   ?dry_run=1  : aucune ecriture, aucun email ; renvoie la liste des cibles
//   ?limit=N    : borne le nombre d'emails de ce passage (max BATCH_LIMIT)

// Cadence : voir src/lib/profile-reminder.ts (partage avec l'action staff).
const BATCH_LIMIT = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/profile-reminders] CRON_SECRET manquant en production");
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
  if (!appUrl) {
    console.error("[cron/profile-reminders] APP_URL manquant");
    return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const createdBefore = new Date(now.getTime() - PROFILE_REMINDER_AFTER_DAYS * 86_400_000).toISOString();
  const reminderBefore = new Date(now.getTime() - PROFILE_REMINDER_COOLDOWN_DAYS * 86_400_000).toISOString();

  // ---- Passe 1 : relances ------------------------------------------------
  const { data: candidates, error } = await admin
    .from("testers")
    .select("*")
    .eq("status", "pending")
    .eq("profile_completed", false)
    .lt("created_at", createdBefore)
    .lt("profile_reminder_count", PROFILE_REMINDER_MAX)
    .or(`profile_reminder_sent_at.is.null,profile_reminder_sent_at.lt.${reminderBefore}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[cron/profile-reminders] select failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ---- Passe 2 : mise en pause apres la derniere relance sans reponse ----
  const { data: toPause, error: pauseSelErr } = await admin
    .from("testers")
    .select("id, email, profile_reminder_sent_at")
    .eq("status", "pending")
    .eq("profile_completed", false)
    .gte("profile_reminder_count", PROFILE_REMINDER_MAX)
    .lt("profile_reminder_sent_at", reminderBefore)
    .limit(BATCH_LIMIT);

  if (pauseSelErr) {
    console.error("[cron/profile-reminders] pause select failed", pauseSelErr.message);
    return NextResponse.json({ error: pauseSelErr.message }, { status: 500 });
  }

  const targets = (candidates ?? []).map((t) => {
    const c = computeProfileCompleteness(t);
    return { tester: t, completeness: c, reminderNumber: (t.profile_reminder_count ?? 0) + 1 };
  }).filter((x) => !x.completeness.isComplete && !!x.tester.email);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      would_remind: targets.map((x) => ({
        email: x.tester.email,
        created_at: x.tester.created_at,
        reminder_number: x.reminderNumber,
        missing_count: x.completeness.count,
      })),
      would_pause: (toPause ?? []).map((t) => ({ email: t.email, last_reminder_at: t.profile_reminder_sent_at })),
      config: { after_days: PROFILE_REMINDER_AFTER_DAYS, cooldown_days: PROFILE_REMINDER_COOLDOWN_DAYS, max: PROFILE_REMINDER_MAX, limit },
    });
  }

  let reminded = 0;
  const skipped = (candidates?.length ?? 0) - targets.length;
  const errors: { tester_id: string; reason: string }[] = [];

  for (const { tester } of targets) {
    try {
      await sendProfileReminder(admin, tester, appUrl);
      reminded++;
    } catch (mailErr) {
      const reason = mailErr instanceof Error ? mailErr.message : "email_failed";
      if (reason.startsWith("update_failed_post_email")) reminded++;
      console.error("[cron/profile-reminders] failed for", tester.id, reason);
      errors.push({ tester_id: tester.id, reason });
    }
  }

  // Mise en pause : transition mono-directionnelle, filtre atomique sur le
  // statut precedent (anti-race si le testeur complete pile a ce moment).
  let paused = 0;
  for (const t of toPause ?? []) {
    const { data: upd, error: pauseErr } = await admin
      .from("testers")
      .update({ status: "inactive", updated_at: nowIso })
      .eq("id", t.id)
      .eq("status", "pending")
      .eq("profile_completed", false)
      .select("id");
    if (pauseErr) {
      errors.push({ tester_id: t.id, reason: "pause_failed" });
      continue;
    }
    if (upd && upd.length > 0) paused++;
  }

  log.info("profile reminders", { reminded, skipped, paused, errors: errors.length });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.profile-reminders",
    action: "tester.profile_reminder_batch",
    entity_type: "cron",
    metadata: {
      reminded,
      skipped,
      paused,
      errors,
      after_days: PROFILE_REMINDER_AFTER_DAYS,
      cooldown_days: PROFILE_REMINDER_COOLDOWN_DAYS,
      max: PROFILE_REMINDER_MAX,
      limit,
    },
  });

  return NextResponse.json({ reminded, skipped, paused, errors });
}
