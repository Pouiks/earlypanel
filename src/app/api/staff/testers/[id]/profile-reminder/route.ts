import { NextResponse, type NextRequest } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { sendProfileReminder, PROFILE_REMINDER_MAX } from "@/lib/profile-reminder";

export const runtime = "nodejs";

/**
 * POST /api/staff/testers/[id]/profile-reminder
 *
 * Relance manuelle immediate d'un testeur pending/incomplet, sans attendre
 * le cooldown du cron. Le plafond de PROFILE_REMINDER_MAX reste respecte
 * (anti-spam) : au-dela, 409.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) return NextResponse.json({ error: "APP_URL non configuré" }, { status: 500 });

  const { id } = await ctx.params;
  const { data: tester, error } = await admin.from("testers").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tester) return NextResponse.json({ error: "Testeur introuvable" }, { status: 404 });

  if (tester.status !== "pending" || tester.profile_completed) {
    return NextResponse.json({ error: "Ce testeur n'est pas en attente de complétion de profil" }, { status: 409 });
  }
  if (computeProfileCompleteness(tester).isComplete) {
    return NextResponse.json({ error: "Profil déjà complet" }, { status: 409 });
  }
  if ((tester.profile_reminder_count ?? 0) >= PROFILE_REMINDER_MAX) {
    return NextResponse.json({ error: `Plafond de ${PROFILE_REMINDER_MAX} relances atteint` }, { status: 409 });
  }

  try {
    const result = await sendProfileReminder(admin, tester, appUrl);
    await logStaffAction(
      {
        staff_id: staff.id,
        staff_email: staff.email,
        action: "tester.profile_reminder_manual",
        entity_type: "tester",
        entity_id: tester.id,
        metadata: { reminder_number: result.reminderNumber, missing_count: result.missingCount },
      },
      request,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur d'envoi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
