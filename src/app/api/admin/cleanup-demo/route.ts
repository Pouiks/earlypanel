import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";

export const runtime = "nodejs";

// =====================================================================
// Endpoint de cleanup pour donnees seedees par /api/admin/seed-demo.
// =====================================================================
// Supprime :
//   - Tous les projets dont title commence par '[E2E TEST]' (CASCADE
//     supprime project_testers, questions, NDAs, reports, ...)
//   - Tous les testeurs dont email finit par '@e2e.earlypanel.test'
//     OU dont app_metadata.e2e_seed=true (CASCADE)
//   - Les auth.users correspondants (sauf s'ils sont staff_members)
//
// /!\  Si tu as utilise un custom_email reel pour le seed (ex: ton vrai
//      email perso), CE script NE le supprimera PAS automatiquement
//      (car il ne matche pas le domaine @e2e.earlypanel.test). Pour le
//      retirer, utilise le script SQL cleanup_non_whitelist_testers.sql
//      ou supprime manuellement.
//
// Securise par STAFF_SETUP_KEY. Audit log de chaque execution.
//
// Body : { "setup_key": "<STAFF_SETUP_KEY>" }

const TESTER_EMAIL_DOMAIN = "@e2e.earlypanel.test";
const PROJECT_TITLE_PREFIX = "[E2E TEST]";

interface CleanupRequest {
  setup_key: string;
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.STAFF_SETUP_KEY?.trim();
  if (!expectedKey) {
    return NextResponse.json({ error: "STAFF_SETUP_KEY non configurée" }, { status: 503 });
  }

  let body: CleanupRequest;
  try {
    body = (await request.json()) as CleanupRequest;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (body.setup_key !== expectedKey) {
    await logStaffAction(
      {
        staff_id: null,
        staff_email: "admin.cleanup-demo",
        action: "demo.cleanup_rejected",
        metadata: { reason: "invalid_key" },
      },
      request
    );
    return NextResponse.json({ error: "Clé invalide" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  // 1. Lister les projets a supprimer (tagging par titre)
  const { data: projects } = await admin
    .from("projects")
    .select("id, title")
    .like("title", `${PROJECT_TITLE_PREFIX}%`);

  // 2. Lister les testeurs a supprimer (tagging par email domain)
  const { data: testers } = await admin
    .from("testers")
    .select("id, email, auth_user_id")
    .like("email", `%${TESTER_EMAIL_DOMAIN}`);

  // 3. Supprimer projets (CASCADE → project_testers, questions, NDAs, reports)
  let deletedProjects = 0;
  if (projects && projects.length > 0) {
    const ids = projects.map((p) => p.id);
    const { error: pErr } = await admin.from("projects").delete().in("id", ids);
    if (pErr) {
      console.error("[cleanup-demo] projects delete failed", pErr);
      return NextResponse.json({ error: `Suppression projets échouée : ${pErr.message}` }, { status: 500 });
    }
    deletedProjects = ids.length;
  }

  // 4. Supprimer testeurs + auth.users
  let deletedTesters = 0;
  let deletedAuthUsers = 0;
  if (testers && testers.length > 0) {
    const testerIds = testers.map((t) => t.id);
    const authUserIds = testers
      .map((t) => t.auth_user_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    // Filtre defensif : ne pas supprimer un auth_user qui est aussi staff_members
    let safeAuthIds: string[] = authUserIds;
    if (authUserIds.length > 0) {
      const { data: staffOverlap } = await admin
        .from("staff_members")
        .select("auth_user_id")
        .in("auth_user_id", authUserIds);
      const staffIds = new Set((staffOverlap ?? []).map((s) => s.auth_user_id));
      safeAuthIds = authUserIds.filter((id) => !staffIds.has(id));
    }

    // 4a. Supprimer testers (CASCADE → project_testers, payouts, score_events, ...)
    const { error: tErr } = await admin.from("testers").delete().in("id", testerIds);
    if (tErr) {
      console.error("[cleanup-demo] testers delete failed", tErr);
      return NextResponse.json({ error: `Suppression testeurs échouée : ${tErr.message}` }, { status: 500 });
    }
    deletedTesters = testerIds.length;

    // 4b. Supprimer auth.users (sauf staff)
    for (const authId of safeAuthIds) {
      const { error: aErr } = await admin.auth.admin.deleteUser(authId);
      if (aErr) {
        console.warn("[cleanup-demo] auth.users delete failed for", authId, aErr.message);
      } else {
        deletedAuthUsers++;
      }
    }
  }

  await logStaffAction(
    {
      staff_id: null,
      staff_email: "admin.cleanup-demo",
      action: "demo.cleanup_executed",
      entity_type: "cron",
      metadata: {
        deleted_projects: deletedProjects,
        deleted_testers: deletedTesters,
        deleted_auth_users: deletedAuthUsers,
      },
    },
    request
  );

  return NextResponse.json({
    success: true,
    deleted: {
      projects: deletedProjects,
      testers: deletedTesters,
      auth_users: deletedAuthUsers,
    },
    note: "Si vous avez seedé avec un custom_email réel (votre adresse perso), supprimez-le manuellement.",
  });
}
