import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("cron/project-reminders");

export const runtime = "nodejs";

// Cron : a mi-parcours d'un projet, relance les testeurs qui ne l'ont pas
// encore complete (status nda_signed / invited / in_progress) pour eviter
// le "trou" de testeurs en fin de campagne.
//
// Idempotence : la colonne project_midway_reminder_sent_at est posee a
// l'envoi. Une seule relance "mi-parcours" par testeur/projet.
//
// Calcul "mi-parcours" : on selectionne les projets actifs dont la date
// courante a depasse start_date + (end_date - start_date) / 2. Pour les
// projets sans start_date (cas legacy), on utilise created_at.

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/project-reminders] CRON_SECRET manquant en production");
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    console.error("[cron/project-reminders] APP_URL manquant");
    return NextResponse.json({ error: "APP_URL manquant" }, { status: 500 });
  }

  const now = new Date();

  // 1) Selection des projets actifs avec dates definies.
  const { data: projects, error: projError } = await admin
    .from("projects")
    .select("id, title, company_name, start_date, end_date, created_at")
    .eq("status", "active")
    .not("end_date", "is", null);

  if (projError) {
    console.error("[cron/project-reminders] projects select failed", projError.message);
    return NextResponse.json({ error: projError.message }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ reminded: 0, projects_at_midway: 0 });
  }

  // 2) Filtrage cote application : on garde les projets qui ont depasse la
  // mi-parcours mais ne sont pas encore termines.
  const projectsAtMidway = projects.filter((p) => {
    const end = p.end_date ? new Date(p.end_date) : null;
    if (!end) return false;
    if (end < now) return false; // deja expire, le cron close-expired s'en charge

    const start = p.start_date
      ? new Date(p.start_date)
      : p.created_at
      ? new Date(p.created_at)
      : null;
    if (!start) return false;

    const midway = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    return now >= midway;
  });

  if (projectsAtMidway.length === 0) {
    return NextResponse.json({ reminded: 0, projects_at_midway: 0 });
  }

  const docLink = `${appUrl}/app/dashboard/missions`;
  const nowIso = now.toISOString();
  let reminded = 0;
  let skipped = 0;
  const errors: { project_tester_id: string; reason: string }[] = [];

  for (const project of projectsAtMidway) {
    // Pour ce projet, lister les testeurs qui sont en cours mais pas finis,
    // et qui n'ont pas encore eu leur relance mi-parcours.
    const { data: testers, error: tError } = await admin
      .from("project_testers")
      .select(`
        id,
        tester_id,
        status,
        tester:testers(email, first_name, last_name)
      `)
      .eq("project_id", project.id)
      .in("status", ["nda_signed", "invited", "in_progress"])
      .is("project_midway_reminder_sent_at", null);

    if (tError) {
      console.error("[cron/project-reminders] testers select failed", project.id, tError.message);
      continue;
    }

    if (!testers || testers.length === 0) continue;

    for (const row of testers) {
      const tester = (Array.isArray(row.tester) ? row.tester[0] : row.tester) as
        | { email: string; first_name: string | null; last_name: string | null }
        | null;
      if (!tester) {
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          to: tester.email,
          toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
          subject: `Mi-parcours : pensez à compléter votre mission ${project.title}`,
          html: buildMidwayEmail({
            firstName: tester.first_name ?? "",
            projectTitle: project.title,
            companyName: project.company_name ?? "",
            docLink,
            endDate: project.end_date,
            currentStatus: row.status,
          }),
        });

        const { error: updErr } = await admin
          .from("project_testers")
          .update({ project_midway_reminder_sent_at: nowIso })
          .eq("id", row.id);

        if (updErr) {
          console.error("[cron/project-reminders] update reminder failed", row.id, updErr.message);
          errors.push({ project_tester_id: row.id, reason: "update_failed_post_email" });
        }

        reminded++;
      } catch (mailErr) {
        console.error("[cron/project-reminders] email failed for", row.id, mailErr);
        errors.push({
          project_tester_id: row.id,
          reason: mailErr instanceof Error ? mailErr.message : "email_failed",
        });
      }
    }
  }

  log.info("project midway reminders sent", {
    reminded,
    skipped,
    errors: errors.length,
    projects_at_midway: projectsAtMidway.length,
  });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.project-reminders",
    action: "project.midway_reminder_batch",
    entity_type: "cron",
    metadata: {
      reminded,
      skipped,
      errors,
      projects_at_midway: projectsAtMidway.length,
    },
  });

  return NextResponse.json({
    reminded,
    skipped,
    projects_at_midway: projectsAtMidway.length,
    errors,
  });
}

function buildMidwayEmail(opts: {
  firstName: string;
  projectTitle: string;
  companyName: string;
  docLink: string;
  endDate: string | null;
  currentStatus: string;
}): string {
  const greeting = opts.firstName ? `Bonjour ${opts.firstName},` : "Bonjour,";
  const endText = opts.endDate
    ? `<strong>${new Date(opts.endDate).toLocaleDateString("fr-FR", { dateStyle: "long" })}</strong>`
    : "bientôt";
  const ctaLabel =
    opts.currentStatus === "nda_signed" || opts.currentStatus === "invited"
      ? "Démarrer la mission →"
      : "Reprendre la mission →";
  const intro =
    opts.currentStatus === "nda_signed" || opts.currentStatus === "invited"
      ? "Le projet ci-dessous est à mi-parcours et vous n'avez pas encore démarré la mission."
      : "Le projet ci-dessous est à mi-parcours. Pensez à finaliser votre mission avant la date de fin.";
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
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">${intro}</p>
          <p style="font-size:15px;color:#1d1d1f;font-weight:700;margin:8px 0 4px;">${opts.projectTitle}</p>
          ${opts.companyName ? `<p style="font-size:13px;color:#86868B;margin:0 0 20px;">${opts.companyName}</p>` : ""}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Date de fin : ${endText}.</p>
          <a href="${opts.docLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">${ctaLabel}</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Compléter à temps assure votre rémunération et votre score qualité.</p>
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
