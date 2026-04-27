import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("cron/nda-reminders");

export const runtime = "nodejs";

// Cron : relance les testeurs en status='nda_sent' qui n'ont pas signe leur
// NDA depuis plus de NDA_REMINDER_AFTER_DAYS jours, et qui n'ont pas recu
// de relance depuis NDA_REMINDER_COOLDOWN_DAYS jours.
//
// Idempotence : la colonne `nda_reminder_sent_at` est mise a jour apres
// chaque envoi, ce qui evite le spam si le cron tourne plusieurs fois.
//
// On ne relance que si le projet est encore actif et que la deadline n'est
// pas passee (sinon le malus de cloture s'applique deja - inutile de
// relancer un testeur qui ne pourra plus signer a temps).

const NDA_REMINDER_AFTER_DAYS = 3;
const NDA_REMINDER_COOLDOWN_DAYS = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/nda-reminders] CRON_SECRET manquant en production");
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    console.error("[cron/nda-reminders] APP_URL manquant");
    return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });
  }

  const now = new Date();
  const sentBefore = new Date(now.getTime() - NDA_REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const reminderBefore = new Date(now.getTime() - NDA_REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // On selectionne :
  //   - status = 'nda_sent'
  //   - nda_sent_at < now - 3j (NDA recu depuis assez longtemps)
  //   - nda_reminder_sent_at IS NULL OR nda_reminder_sent_at < now - 3j
  // Filtrer le projet actif et non expire se fait apres (jointure).
  const { data: candidates, error } = await admin
    .from("project_testers")
    .select(`
      id,
      project_id,
      tester_id,
      nda_sent_at,
      nda_reminder_sent_at,
      project:projects(id, title, company_name, status, end_date),
      tester:testers(email, first_name, last_name)
    `)
    .eq("status", "nda_sent")
    .lt("nda_sent_at", sentBefore)
    .or(`nda_reminder_sent_at.is.null,nda_reminder_sent_at.lt.${reminderBefore}`);

  if (error) {
    console.error("[cron/nda-reminders] select failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ reminded: 0, skipped: 0 });
  }

  const docLink = `${appUrl}/app/dashboard/documents`;
  const nowIso = now.toISOString();
  let reminded = 0;
  let skipped = 0;
  const errors: { project_tester_id: string; reason: string }[] = [];

  for (const row of candidates) {
    // Le typage Supabase via select chained renvoie un single objet pour la
    // relation 1-to-1 mais TS l'infere parfois en tableau. Cast defensif.
    const project = (Array.isArray(row.project) ? row.project[0] : row.project) as
      | { id: string; title: string; company_name: string | null; status: string; end_date: string | null }
      | null;
    const tester = (Array.isArray(row.tester) ? row.tester[0] : row.tester) as
      | { email: string; first_name: string | null; last_name: string | null }
      | null;

    if (!project || !tester) {
      skipped++;
      continue;
    }

    // Skip si projet plus actif (closed/archived) ou deadline passee :
    // pas la peine de relancer un NDA pour un projet ou le testeur ne
    // pourra plus participer.
    if (project.status !== "active") {
      skipped++;
      continue;
    }
    if (project.end_date && new Date(project.end_date) < now) {
      skipped++;
      continue;
    }

    try {
      await sendEmail({
        to: tester.email,
        toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
        subject: `Relance : NDA en attente de signature - ${project.title}`,
        html: buildReminderEmail({
          firstName: tester.first_name ?? "",
          projectTitle: project.title,
          companyName: project.company_name ?? "",
          docLink,
          deadline: project.end_date,
        }),
      });

      const { error: updErr } = await admin
        .from("project_testers")
        .update({ nda_reminder_sent_at: nowIso })
        .eq("id", row.id);

      if (updErr) {
        // L'email est parti mais on n'a pas pu marquer la relance. Au pire,
        // le testeur recevra une 2eme relance demain - acceptable.
        console.error("[cron/nda-reminders] update reminder timestamp failed", row.id, updErr.message);
        errors.push({ project_tester_id: row.id, reason: "update_failed_post_email" });
      }

      reminded++;
    } catch (mailErr) {
      console.error("[cron/nda-reminders] email failed for", row.id, mailErr);
      errors.push({
        project_tester_id: row.id,
        reason: mailErr instanceof Error ? mailErr.message : "email_failed",
      });
    }
  }

  log.info("nda reminders sent", { reminded, skipped, errors: errors.length });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.nda-reminders",
    action: "nda.reminder_batch",
    entity_type: "cron",
    metadata: {
      reminded,
      skipped,
      errors,
      after_days: NDA_REMINDER_AFTER_DAYS,
      cooldown_days: NDA_REMINDER_COOLDOWN_DAYS,
    },
  });

  return NextResponse.json({ reminded, skipped, errors });
}

function buildReminderEmail(opts: {
  firstName: string;
  projectTitle: string;
  companyName: string;
  docLink: string;
  deadline: string | null;
}): string {
  const greeting = opts.firstName ? `Bonjour ${opts.firstName},` : "Bonjour,";
  const deadlineText = opts.deadline
    ? `Le projet se termine le <strong>${new Date(opts.deadline).toLocaleDateString("fr-FR", { dateStyle: "long" })}</strong>. Pensez à signer rapidement pour ne pas manquer la fenêtre de participation.`
    : "Pensez à signer rapidement pour pouvoir démarrer la mission.";
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#0A7A5A;padding:24px 32px;">
          <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">early<span style="color:#2DD4A0;">panel</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">${greeting}</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Petit rappel : le NDA pour le projet ci-dessous est toujours en attente de votre signature.</p>
          <p style="font-size:15px;color:#1d1d1f;font-weight:700;margin:8px 0 4px;">${opts.projectTitle}</p>
          ${opts.companyName ? `<p style="font-size:13px;color:#86868B;margin:0 0 20px;">${opts.companyName}</p>` : ""}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">${deadlineText}</p>
          <a href="${opts.docLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Signer le NDA →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Si vous ne souhaitez plus participer à ce projet, ignorez simplement cet email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · Made in France</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
