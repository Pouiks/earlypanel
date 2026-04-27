import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { defaultNdaHtml } from "@/lib/nda-pdf";

export const runtime = "nodejs";

// =====================================================================
// Endpoint de seed pour test E2E manuel.
// =====================================================================
// Cree :
//   - 1 testeur fictif avec profil 100% complet (status='active')
//   - 1 projet en status='draft' avec une question, un NDA par defaut
//
// Tags utilises pour permettre un cleanup deterministe :
//   - tester.email finit par '@e2e.earlypanel.test' (sauf si custom_email passe)
//   - project.title commence par '[E2E TEST]'
//
// Securise par STAFF_SETUP_KEY (meme cle que /api/staff/setup et
// /api/staff/recover-owner). Si la cle leak, l'attaquant peut creer
// du bruit dans la DB mais pas exfiltrer de donnees - et le cleanup
// est instantane.
//
// Idempotent : relancer le seed cree de nouveaux objets sans toucher
// aux precedents (pratique pour empiler plusieurs scenarios). Le
// cleanup les supprime tous d'un coup.
//
// Body :
//   {
//     "setup_key": "<STAFF_SETUP_KEY>",
//     "custom_email"?: "ton@vraie.adresse" // pour recevoir les emails NDA
//   }

const TESTER_EMAIL_DOMAIN = "@e2e.earlypanel.test";
const PROJECT_TITLE_PREFIX = "[E2E TEST]";

interface SeedRequest {
  setup_key: string;
  custom_email?: string;
}

function generatePassword(): string {
  // Format lisible : 16 caracteres alphanumeriques. Suffisant pour le
  // contexte (compte de test, ne touche pas a la prod reelle).
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.STAFF_SETUP_KEY?.trim();
  if (!expectedKey) {
    return NextResponse.json({ error: "STAFF_SETUP_KEY non configurée" }, { status: 503 });
  }

  let body: SeedRequest;
  try {
    body = (await request.json()) as SeedRequest;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (body.setup_key !== expectedKey) {
    await logStaffAction(
      {
        staff_id: null,
        staff_email: "admin.seed-demo",
        action: "demo.seed_rejected",
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

  // Email tester : custom (pour recevoir les emails reels) ou fictif unique.
  const ts = Date.now().toString(36);
  const testerEmail = body.custom_email?.trim().toLowerCase() || `e2e-${ts}${TESTER_EMAIL_DOMAIN}`;
  const testerPassword = generatePassword();

  // 1. Creer le user dans auth.users
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: testerEmail,
    password: testerPassword,
    email_confirm: true, // skip verification email
    app_metadata: { role: "tester", e2e_seed: true },
  });

  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: `Création auth user échouée : ${authError?.message ?? "inconnu"}` },
      { status: 500 }
    );
  }

  const authUserId = authData.user.id;

  // 2. Creer la ligne testers avec PROFIL 100% COMPLET (cf. migration 026 :
  //    14 champs texte + 4 tableaux). Le trigger auto_activate_tester va
  //    automatiquement passer status='active' + profile_completed=true au
  //    prochain UPDATE, mais on peut aussi forcer directement a la creation.
  const { data: tester, error: testerError } = await admin
    .from("testers")
    .insert({
      auth_user_id: authUserId,
      email: testerEmail,
      first_name: "E2E",
      last_name: `Test-${ts}`,
      phone: "+33600000000",
      birth_date: "1990-01-01",
      address: "1 rue du Test",
      city: "Paris",
      postal_code: "75001",
      job_title: "Testeur QA",
      sector: "Tech / SaaS",
      company_size: "11-50",
      digital_level: "expert",
      connection: "Fibre",
      availability: "3-5",
      ux_experience: "Régulièrement",
      tools: ["Notion", "Slack", "Figma"],
      browsers: ["Chrome", "Safari"],
      devices: ["PC Windows", "iPhone"],
      interests: ["SaaS B2B", "Fintech"],
      status: "active",
      profile_completed: true,
      profile_step: 5,
      source: "e2e-seed",
    })
    .select("id, email")
    .single();

  if (testerError || !tester) {
    // Rollback auth user en cas d'echec d'insert testers
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return NextResponse.json(
      { error: `Création testeur échouée : ${testerError?.message ?? "inconnu"}` },
      { status: 500 }
    );
  }

  // 3. Creer le projet test avec dates valides (start aujourd'hui, end +14j)
  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      title: `${PROJECT_TITLE_PREFIX} Demo Project ${ts}`,
      description: "Projet de démonstration créé par /api/admin/seed-demo. À supprimer via /api/admin/cleanup-demo.",
      company_name: "Demo Company SAS",
      sector: "Tech / SaaS",
      contact_first_name: "Demo",
      contact_last_name: "Contact",
      contact_email: "demo@earlypanel.test",
      status: "draft",
      start_date: today.toISOString().slice(0, 10),
      end_date: inTwoWeeks.toISOString().slice(0, 10),
      base_reward_cents: 2000,
      target_age_min: 18,
      target_age_max: 65,
    })
    .select("id, title")
    .single();

  if (projectError || !project) {
    // Rollback tester + auth user (ignorer les erreurs de rollback)
    try { await admin.from("testers").delete().eq("id", tester.id); } catch { /* noop */ }
    try { await admin.auth.admin.deleteUser(authUserId); } catch { /* noop */ }
    return NextResponse.json(
      { error: `Création projet échouée : ${projectError?.message ?? "inconnu"}` },
      { status: 500 }
    );
  }

  // 4. Ajouter une question (requise pour activer le projet via NDA send)
  await admin.from("project_questions").insert({
    project_id: project.id,
    position: 0,
    question_text: "Décrivez votre première impression sur l'application en 2-3 phrases.",
  });

  // 5. Creer le NDA par defaut (pour que l'invitation puisse l'envoyer)
  await admin.from("project_ndas").insert({
    project_id: project.id,
    title: "[E2E TEST] Accord de confidentialité",
    content_html: defaultNdaHtml(),
  });

  await logStaffAction(
    {
      staff_id: null,
      staff_email: "admin.seed-demo",
      action: "demo.seed_created",
      entity_type: "project",
      entity_id: project.id,
      metadata: {
        tester_id: tester.id,
        tester_email: tester.email,
        project_title: project.title,
        custom_email_provided: !!body.custom_email,
      },
    },
    request
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    success: true,
    instructions: "Connectez-vous en tester avec les credentials ci-dessous, puis utilisez l'espace staff pour inviter ce testeur au projet créé.",
    tester: {
      id: tester.id,
      email: testerEmail,
      password: testerPassword,
      login_url: `${appUrl}/app/login`,
    },
    project: {
      id: project.id,
      title: project.title,
      staff_url: `${appUrl}/staff/dashboard/projects/${project.id}`,
    },
    cleanup: {
      url: `${appUrl}/api/admin/cleanup-demo`,
      method: "POST",
      body: { setup_key: "<STAFF_SETUP_KEY>" },
    },
  });
}
