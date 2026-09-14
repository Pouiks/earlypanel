import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import {
  selectCampaignCandidates,
  sendAvailabilityCampaign,
  summarizeCampaign,
} from "@/lib/availability-campaign";
import { shouldAutoRemind } from "@/lib/tester-engagement";

export const runtime = "nodejs";
// Envoi séquentiel throttlé (~2,5 mails/s) : sur un gros volume la fonction doit
// pouvoir tourner plus que les 10-15 s par défaut de Vercel, sinon elle est tuée
// en plein milieu (envoi partiel + erreur affichée). 60 s couvre ~150 mails.
export const maxDuration = 60;

/**
 * POST /api/staff/testers/availability-campaign
 *
 * Envoie aux testeurs actifs au profil complet SANS disponibilité confirmée
 * en cours un email « êtes-vous toujours disponible ? » avec 2 boutons
 * cliquables sans login. Même boucle que le cron hebdomadaire
 * (src/lib/availability-campaign.ts) : 3 relances max espacées de 14 j,
 * chaque envoi manuel compte, email-avant-DB, marquage vérifié. La mise en
 * pause, elle, reste au cron.
 *
 * Body (optionnel) :
 *   { tester_ids?: string[] }  cible un sous-ensemble (dormants compris)
 *   { test_email?: string }    envoi à UN destinataire, sans cooldown ni
 *                              marquage, pour valider rendu et liens
 */
export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL non configuré" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const testerIds = Array.isArray(body?.tester_ids)
    ? (body.tester_ids as unknown[]).filter((x): x is string => typeof x === "string")
    : null;
  const testEmail =
    typeof body?.test_email === "string" && body.test_email.trim() ? body.test_email.trim() : null;
  // Identifiant d'envoi groupe pilote par le navigateur (lots de quelques ids) :
  // relie les entrees d'audit d'un meme clic.
  const batchId = typeof body?.batch_id === "string" && body.batch_id.trim() ? body.batch_id.trim().slice(0, 64) : null;
  const isTest = !!testEmail;

  let recipients: { id: string; email: string | null; first_name: string | null }[];
  if (isTest) {
    const { data, error } = await admin
      .from("testers")
      .select("id, email, first_name")
      .ilike("email", testEmail!)
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: `Aucun testeur avec l'email ${testEmail}` }, { status: 404 });
    }
    recipients = data;
  } else {
    const { data, error } = await selectCampaignCandidates(admin, { testerIds });
    if (error) return NextResponse.json({ error }, { status: 500 });
    recipients = (data ?? []).filter((t) => shouldAutoRemind(t));
  }

  const results = await sendAvailabilityCampaign(admin, {
    recipients,
    appUrl,
    isTest,
    throttle: process.env.SKIP_EMAILS !== "true", // pas de débit Resend à gérer en dev
  });
  const summary = summarizeCampaign(results);

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: isTest ? "availability_campaign.test" : "availability_campaign.sent",
      entity_type: "tester",
      metadata: {
        ...summary,
        targeted_subset: !!testerIds,
        batch_id: batchId ?? undefined,
        test_email: testEmail ?? undefined,
      },
    },
    request
  );

  return NextResponse.json({ ...summary, test: isTest });
}
