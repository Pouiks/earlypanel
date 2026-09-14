import { NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AVAILABILITY_REMINDER_COOLDOWN_DAYS,
  AVAILABILITY_REMINDER_MAX,
  describeAvailabilityReminderState,
  engagementState,
} from "@/lib/tester-engagement";
import { lastActivityAt } from "@/lib/tester-activity";

export const runtime = "nodejs";

/**
 * GET /api/staff/testers/availability-reminders
 *
 * Vue staff de la boucle de relance « êtes-vous toujours disponible ? » :
 * tous les testeurs actifs au profil complet SANS disponibilité confirmée en
 * cours (avec leur état de relance), plus ceux mis en pause par le cron
 * (inactive + 3 relances). Miroir de /profile-reminders pour la page Relances.
 */
export async function GET() {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const now = new Date();
  const nowIso = now.toISOString();
  const { data, error } = await admin
    .from("testers")
    .select(
      "id, email, first_name, last_name, job_title, sector, city, status, profile_completed, created_at, last_seen_at, last_login_at, available_until, availability_responded_at, availability_check_sent_at, availability_check_count, missions_completed"
    )
    .or(
      `and(status.eq.active,profile_completed.eq.true,or(available_until.is.null,available_until.lt.${nowIso})),and(status.eq.inactive,availability_check_count.gte.${AVAILABILITY_REMINDER_MAX})`
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((t) => {
    const state = describeAvailabilityReminderState(t, now);
    return {
      id: t.id,
      email: t.email,
      first_name: t.first_name,
      last_name: t.last_name,
      job_title: t.job_title,
      sector: t.sector,
      city: t.city,
      status: t.status,
      created_at: t.created_at,
      last_activity_at: lastActivityAt(t),
      engagement: engagementState(t, now),
      missions_completed: t.missions_completed ?? 0,
      responded_at: t.availability_responded_at,
      reminder_count: state.count,
      reminder_sent_at: t.availability_check_sent_at,
      state: state.kind,
      next_at: state.next_at,
    };
  });

  const summary = {
    total: rows.length,
    due: rows.filter((r) => r.state === "due").length,
    cooldown: rows.filter((r) => r.state === "cooldown").length,
    exhausted: rows.filter((r) => r.state === "exhausted").length,
    paused: rows.filter((r) => r.state === "paused").length,
    dormant: rows.filter((r) => r.engagement === "dormant").length,
  };

  return NextResponse.json({
    summary,
    rows,
    max: AVAILABILITY_REMINDER_MAX,
    cooldown_days: AVAILABILITY_REMINDER_COOLDOWN_DAYS,
  });
}
