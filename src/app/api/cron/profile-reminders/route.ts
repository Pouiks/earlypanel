import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildProfileReminderEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { computeProfileCompleteness } from "@/lib/profile-completeness";

const log = logger("cron/profile-reminders");

export const runtime = "nodejs";

// Cron : relance les testeurs inscrits (status='pending') dont le profil
// n'est pas complet, avec un magic link vers l'onboarding.
//
// Cadence : 1re relance PROFILE_REMINDER_AFTER_DAYS apres l'inscription,
// puis une tous les PROFILE_REMINDER_COOLDOWN_DAYS, PROFILE_REMINDER_MAX
// relances au total. Ensuite on arrete : un profil jamais complete apres
// 3 rappels ne le sera pas, et on ne veut pas finir en spam.
//
// Idempotence : `profile_reminder_sent_at` (cooldown) + `profile_reminder_count`
// (plafond), mis a jour APRES l'envoi reussi. Un testeur passe en 'inactive'
// (opt-out) ou 'active' (profil complete) sort du filtre tout seul.

const PROFILE_REMINDER_AFTER_DAYS = 2;
const PROFILE_REMINDER_COOLDOWN_DAYS = 7;
const PROFILE_REMINDER_MAX = 3;
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

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    console.error("[cron/profile-reminders] APP_URL manquant");
    return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });
  }

  const now = new Date();
  const createdBefore = new Date(now.getTime() - PROFILE_REMINDER_AFTER_DAYS * 86_400_000).toISOString();
  const reminderBefore = new Date(now.getTime() - PROFILE_REMINDER_COOLDOWN_DAYS * 86_400_000).toISOString();

  const { data: candidates, error } = await admin
    .from("testers")
    .select("*")
    .eq("status", "pending")
    .eq("profile_completed", false)
    .lt("created_at", createdBefore)
    .lt("profile_reminder_count", PROFILE_REMINDER_MAX)
    .or(`profile_reminder_sent_at.is.null,profile_reminder_sent_at.lt.${reminderBefore}`)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("[cron/profile-reminders] select failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ reminded: 0, skipped: 0, errors: [] });
  }

  const nowIso = now.toISOString();
  let reminded = 0;
  let skipped = 0;
  const errors: { tester_id: string; reason: string }[] = [];

  for (const tester of candidates) {
    // Defense en profondeur : si le trigger DB n'a pas encore active le
    // profil mais qu'il est complet cote app, pas de relance.
    const completeness = computeProfileCompleteness(tester);
    if (completeness.isComplete || !tester.email) {
      skipped++;
      continue;
    }

    try {
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: tester.email,
        options: { redirectTo: `${appUrl}/app/auth/callback` },
      });
      const hashedToken = linkData?.properties?.hashed_token;
      if (linkErr || !hashedToken) {
        throw new Error(linkErr?.message || "magic link indisponible");
      }
      const callback = new URL(`${appUrl}/app/auth/callback`);
      callback.searchParams.set("token_hash", hashedToken);
      callback.searchParams.set("type", "magiclink");
      callback.searchParams.set("next", "/app/onboarding");

      const reminderNumber = (tester.profile_reminder_count ?? 0) + 1;
      await sendEmail({
        to: tester.email,
        toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
        subject: reminderNumber >= PROFILE_REMINDER_MAX
          ? "Dernier rappel : votre profil earlypanel est incomplet"
          : `Il manque ${completeness.count} information${completeness.count > 1 ? "s" : ""} à votre profil earlypanel`,
        html: buildProfileReminderEmail({
          firstName: tester.first_name ?? null,
          missingCount: completeness.count,
          missingLabels: completeness.missing.map((m) => m.label),
          magicLink: callback.toString(),
          reminderNumber,
          isLast: reminderNumber >= PROFILE_REMINDER_MAX,
        }),
      });

      // Idempotence : APRES l'envoi reussi.
      const { error: updErr } = await admin
        .from("testers")
        .update({ profile_reminder_sent_at: nowIso, profile_reminder_count: reminderNumber })
        .eq("id", tester.id);
      if (updErr) {
        console.error("[cron/profile-reminders] update failed", tester.id, updErr.message);
        errors.push({ tester_id: tester.id, reason: "update_failed_post_email" });
      }
      reminded++;
    } catch (mailErr) {
      console.error("[cron/profile-reminders] email failed for", tester.id, mailErr);
      errors.push({ tester_id: tester.id, reason: mailErr instanceof Error ? mailErr.message : "email_failed" });
    }
  }

  log.info("profile reminders sent", { reminded, skipped, errors: errors.length });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.profile-reminders",
    action: "tester.profile_reminder_batch",
    entity_type: "cron",
    metadata: {
      reminded,
      skipped,
      errors,
      after_days: PROFILE_REMINDER_AFTER_DAYS,
      cooldown_days: PROFILE_REMINDER_COOLDOWN_DAYS,
      max: PROFILE_REMINDER_MAX,
    },
  });

  return NextResponse.json({ reminded, skipped, errors });
}
