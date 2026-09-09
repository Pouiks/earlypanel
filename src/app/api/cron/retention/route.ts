import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { activityFilterToOr, lastActivityAt, RGPD_RETENTION_DAYS } from "@/lib/tester-activity";
import {
  RETENTION_WARN_AFTER_DAYS,
  RETENTION_WARNING_DAYS,
  anonymizationDate,
  anonymizedTesterPatch,
  buildRetentionWarningEmail,
  retentionStage,
  type RetentionTester,
} from "@/lib/tester-retention";

const log = logger("cron/retention");

export const runtime = "nodejs";

// Cron : applique la duree de conservation promise dans la politique de
// confidentialite (3 ans apres la derniere connexion, migration 043/044).
//
//   1. warn      : 90 j avant l'echeance, email « connectez-vous pour garder
//                  votre compte ». Idempotence : retention_warning_sent_at
//                  (re-envoye seulement apres un retour puis une nouvelle
//                  periode d'inactivite, cf. retentionStage).
//   2. anonymize : echeance atteinte, averti depuis >= 90 j sans retour.
//                  Identite / coordonnees / IBAN effaces, compte auth
//                  supprime. One-shot : anonymized_at.
//
// Jamais anonymise : testeur avec un versement encore du (> 0 €, non paye).
// Effacer son IBAN rendrait la dette impayable ; il est remonte au staff
// dans le compte-rendu (skipped_pending_payout).
//
// Conserve volontairement : reponses aux missions (livrable client, rattache
// a un id anonyme), ecritures de paiement (comptabilite), PDF de NDA signes
// (preuve contractuelle), entrees d'audit (append-only).
//
// Appele par /api/cron/daily-reminders (limite Vercel Hobby : 2 crons).
// ?dry_run=1 : aucune ecriture, aucun email ; liste les cibles.
// ?limit=N   : borne le nombre de comptes traites (max BATCH_LIMIT).

const BATCH_LIMIT = 100;

type SelectedTester = RetentionTester & {
  email: string | null;
  first_name: string | null;
  auth_user_id: string | null;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/retention] CRON_SECRET manquant en production");
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
    console.error("[cron/retention] APP_URL manquant");
    return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Pre-filtre SQL large (inactifs depuis >= 2 ans 9 mois, encore nominatifs),
  // decision fine en JS via retentionStage (avertissement vs echeance).
  const cutoff = new Date(now.getTime() - RETENTION_WARN_AFTER_DAYS * 86_400_000).toISOString();
  const orClause = `last_seen_at.lt."${cutoff}",and(last_seen_at.is.null,created_at.lt."${cutoff}")`;

  const { data: candidates, error } = await admin
    .from("testers")
    .select("id, email, first_name, auth_user_id, created_at, last_login_at, last_seen_at, retention_warning_sent_at, anonymized_at")
    .is("anonymized_at", null)
    .or(orClause)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[cron/retention] select failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (candidates ?? []) as SelectedTester[];
  const toWarn = rows.filter((t) => retentionStage(t, now) === "warn");
  const toAnonymize = rows.filter((t) => retentionStage(t, now) === "anonymize");

  // Versements encore dus : jamais anonymise tant que la dette n'est pas reglee.
  const pendingByTester = new Set<string>();
  if (toAnonymize.length > 0) {
    const { data: pending } = await admin
      .from("tester_payouts")
      .select("tester_id")
      .in("tester_id", toAnonymize.map((t) => t.id))
      .in("status", ["pending", "approved", "failed"])
      .gt("final_amount_cents", 0);
    for (const p of pending ?? []) pendingByTester.add(p.tester_id as string);
  }

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      would_warn: toWarn.map((t) => ({ id: t.id, email: t.email, last_activity_at: lastActivityAt(t), anonymize_on: anonymizationDate(t, now).toISOString() })),
      would_anonymize: toAnonymize.filter((t) => !pendingByTester.has(t.id)).map((t) => ({ id: t.id, email: t.email, last_activity_at: lastActivityAt(t), warned_at: t.retention_warning_sent_at })),
      skipped_pending_payout: toAnonymize.filter((t) => pendingByTester.has(t.id)).map((t) => ({ id: t.id, email: t.email })),
      config: { retention_days: RGPD_RETENTION_DAYS, warn_after_days: RETENTION_WARN_AFTER_DAYS, warning_days: RETENTION_WARNING_DAYS, limit },
    });
  }

  let warned = 0;
  let anonymized = 0;
  const skippedPendingPayout: string[] = [];
  const errors: { tester_id: string; reason: string }[] = [];

  // ---- Passe 1 : avertissements (email d'abord, marqueur ensuite) --------
  for (const t of toWarn) {
    if (!t.email) continue;
    try {
      const { subject, html } = buildRetentionWarningEmail({
        firstName: t.first_name,
        anonymizeOn: anonymizationDate(t, now),
        loginUrl: `${appUrl}/app/login`,
      });
      const sent = await sendEmail({ to: t.email, subject, html });
      if (!sent.success) throw new Error("email_failed");
      const { error: updErr } = await admin
        .from("testers")
        .update({ retention_warning_sent_at: nowIso })
        .eq("id", t.id)
        .is("anonymized_at", null);
      if (updErr) {
        // Email parti, marqueur non pose : au pire un second email demain.
        errors.push({ tester_id: t.id, reason: "update_failed_post_email" });
      }
      warned++;
    } catch (mailErr) {
      errors.push({ tester_id: t.id, reason: mailErr instanceof Error ? mailErr.message : "email_failed" });
    }
  }

  // ---- Passe 2 : anonymisation ------------------------------------------
  for (const t of toAnonymize) {
    if (pendingByTester.has(t.id)) {
      skippedPendingPayout.push(t.id);
      continue;
    }
    try {
      // 1) IBAN chiffre : supprime en premier (le plus sensible).
      const { error: piErr } = await admin.from("tester_payment_info").delete().eq("tester_id", t.id);
      if (piErr) throw new Error(`payment_info_delete_failed: ${piErr.message}`);

      // 2) Ligne testeur : filtre atomique sur anonymized_at IS NULL (one-shot).
      const { data: upd, error: updErr } = await admin
        .from("testers")
        .update(anonymizedTesterPatch(t.id, now))
        .eq("id", t.id)
        .is("anonymized_at", null)
        .select("id");
      if (updErr) throw new Error(`tester_update_failed: ${updErr.message}`);
      if (!upd || upd.length === 0) continue; // deja fait par un passage concurrent

      // 3) Compte auth : plus aucune connexion possible (FK -> SET NULL).
      if (t.auth_user_id) {
        const { error: authErr } = await admin.auth.admin.deleteUser(t.auth_user_id);
        if (authErr) errors.push({ tester_id: t.id, reason: `auth_delete_failed: ${authErr.message}` });
      }

      // 4) Audit immuable : preuve d'execution, sans donnee nominative.
      await logStaffAction({
        staff_id: null,
        staff_email: "cron.retention",
        action: "tester.anonymized",
        entity_type: "tester",
        entity_id: t.id,
        metadata: {
          last_activity_at: lastActivityAt(t),
          warned_at: t.retention_warning_sent_at,
          retention_days: RGPD_RETENTION_DAYS,
        },
      });
      anonymized++;
    } catch (err) {
      errors.push({ tester_id: t.id, reason: err instanceof Error ? err.message : "anonymize_failed" });
    }
  }

  log.info("retention", { candidates: rows.length, warned, anonymized, skipped_pending_payout: skippedPendingPayout.length, errors: errors.length });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.retention",
    action: "tester.retention_batch",
    entity_type: "cron",
    metadata: {
      candidates: rows.length,
      warned,
      anonymized,
      skipped_pending_payout: skippedPendingPayout,
      errors,
      retention_days: RGPD_RETENTION_DAYS,
      warn_after_days: RETENTION_WARN_AFTER_DAYS,
      warning_days: RETENTION_WARNING_DAYS,
      limit,
    },
  });

  return NextResponse.json({ candidates: rows.length, warned, anonymized, skipped_pending_payout: skippedPendingPayout, errors });
}
