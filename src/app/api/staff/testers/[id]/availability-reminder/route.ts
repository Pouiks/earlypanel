import { NextResponse, type NextRequest } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { CAMPAIGN_RECIPIENT_SELECT, sendAvailabilityCampaign, type CampaignRecipient } from "@/lib/availability-campaign";
import { AVAILABILITY_REMINDER_MAX, isAvailabilityConfirmed, reminderCount } from "@/lib/tester-engagement";

export const runtime = "nodejs";

/**
 * POST /api/staff/testers/[id]/availability-reminder
 *
 * Relance manuelle immédiate « êtes-vous toujours disponible ? », sans
 * attendre le cooldown du cron. Deux cas :
 *   - testeur actif, profil complet, sans disponibilité confirmée : compte
 *     dans la boucle, plafond AVAILABILITY_REMINDER_MAX respecté (409 au-delà) ;
 *   - testeur mis en pause par la boucle (inactive + 3 relances) : renvoi du
 *     lien de réactivation, le compteur reste au plafond. Un clic « Oui »
 *     remet le compte actif et le compteur à zéro.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) return NextResponse.json({ error: "APP_URL non configuré" }, { status: 500 });

  const { id } = await ctx.params;
  const { data: tester, error } = await admin
    .from("testers")
    .select(`${CAMPAIGN_RECIPIENT_SELECT}, status, profile_completed, phone, birth_date, address, postal_code, city, job_title, sector, company_size, digital_level, connection, browsers, devices, tools, interests, availability, ux_experience, last_name`)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tester) return NextResponse.json({ error: "Testeur introuvable" }, { status: 404 });

  const count = reminderCount(tester);
  const pausedByLoop = tester.status === "inactive" && count >= AVAILABILITY_REMINDER_MAX;

  if (!pausedByLoop) {
    if (tester.status !== "active" || !computeProfileCompleteness(tester).isComplete) {
      return NextResponse.json({ error: "Ce testeur n'est pas actif avec un profil complet" }, { status: 409 });
    }
    if (isAvailabilityConfirmed(tester)) {
      return NextResponse.json({ error: "Disponibilité déjà confirmée" }, { status: 409 });
    }
    if (count >= AVAILABILITY_REMINDER_MAX) {
      return NextResponse.json({ error: `Plafond de ${AVAILABILITY_REMINDER_MAX} relances atteint` }, { status: 409 });
    }
  }

  const [result] = await sendAvailabilityCampaign(admin, {
    recipients: [tester as CampaignRecipient],
    appUrl,
    throttle: false,
  });
  if (!result || !result.success) {
    return NextResponse.json({ error: result?.error ?? "Erreur d'envoi" }, { status: 500 });
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: pausedByLoop ? "tester.availability_reminder_resend_paused" : "tester.availability_reminder_manual",
      entity_type: "tester",
      entity_id: tester.id,
      metadata: { reminder_number: result.reminder_no, marked: result.marked, error: result.error },
    },
    request
  );

  return NextResponse.json({ ok: true, reminderNumber: result.reminder_no, marked: result.marked, warning: result.error });
}
