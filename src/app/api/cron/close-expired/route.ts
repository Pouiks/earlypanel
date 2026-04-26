import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyClosureMalusForProject } from "@/lib/apply-mission-closure-malus";
import { logStaffAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("cron/close-expired");

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // SECURITE : en production, CRON_SECRET DOIT etre defini sinon le endpoint
  // est ouvert au monde et permet de forcer la cloture de projets a distance.
  // En developpement on tolere l'absence pour faciliter les tests locaux.
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/close-expired] CRON_SECRET manquant en production");
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config manquante" }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("projects")
    .select("id, title, end_date")
    .eq("status", "active")
    .lt("end_date", now);

  if (error) {
    console.error("[cron/close-expired]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired?.length) {
    return NextResponse.json({ closed: 0, projects: [], malus: { nda_unsigned: 0, deadline_exceeded: 0 } });
  }

  const ids = expired.map((p) => p.id);

  const { error: updateError } = await admin
    .from("projects")
    .update({ status: "closed" })
    .in("id", ids);

  if (updateError) {
    console.error("[cron/close-expired] update failed", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // BUG #11 : appliquer ici les malus pour tous les testeurs des projets fermes,
  // independamment du fait qu'ils consultent ou non leur mission. Les erreurs sont
  // capturees individuellement pour ne pas bloquer la cloture des autres projets.
  let totalNdaUnsigned = 0;
  let totalDeadlineExceeded = 0;
  for (const projectId of ids) {
    try {
      const r = await applyClosureMalusForProject(admin, projectId);
      totalNdaUnsigned += r.nda_unsigned;
      totalDeadlineExceeded += r.deadline_exceeded;
    } catch (err) {
      console.error(`[cron/close-expired] malus failed for ${projectId}`, err);
    }
  }

  log.info("projects closed", {
    closed: ids.length,
    nda_unsigned: totalNdaUnsigned,
    deadline_exceeded: totalDeadlineExceeded,
    titles: expired.map((p) => p.title),
  });

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.close-expired",
    action: "project.auto_close",
    entity_type: "cron",
    entity_id: null,
    metadata: {
      closed_count: ids.length,
      project_ids: ids,
      malus: {
        nda_unsigned: totalNdaUnsigned,
        deadline_exceeded: totalDeadlineExceeded,
      },
    },
  });

  return NextResponse.json({
    closed: ids.length,
    projects: expired.map((p) => ({ id: p.id, title: p.title, end_date: p.end_date })),
    malus: {
      nda_unsigned: totalNdaUnsigned,
      deadline_exceeded: totalDeadlineExceeded,
    },
  });
}
