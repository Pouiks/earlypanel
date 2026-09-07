import { NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { describeReminderState, PROFILE_REMINDER_MAX } from "@/lib/profile-reminder";

export const runtime = "nodejs";

/**
 * GET /api/staff/testers/profile-reminders
 *
 * Vue staff des relances « profil incomplet » : tous les testeurs pending
 * non completes (avec leur etat de relance et les champs manquants) plus
 * ceux mis en pause par le cron (inactive + relances epuisees).
 */
export async function GET() {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { data, error } = await admin
    .from("testers")
    .select("*")
    .or(`and(status.eq.pending,profile_completed.eq.false),and(status.eq.inactive,profile_reminder_count.gte.${PROFILE_REMINDER_MAX})`)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const rows = (data ?? []).map((t) => {
    const completeness = computeProfileCompleteness(t);
    const state = describeReminderState(t, now);
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
      profile_step: t.profile_step,
      missing_count: completeness.count,
      missing_labels: completeness.missing.map((m) => m.label),
      reminder_count: t.profile_reminder_count ?? 0,
      reminder_sent_at: t.profile_reminder_sent_at,
      state: state.kind,
      next_at: state.next_at,
    };
  });

  const summary = {
    total: rows.length,
    too_recent: rows.filter((r) => r.state === "too_recent").length,
    due: rows.filter((r) => r.state === "due").length,
    cooldown: rows.filter((r) => r.state === "cooldown").length,
    exhausted: rows.filter((r) => r.state === "exhausted").length,
    paused: rows.filter((r) => r.state === "paused").length,
  };

  return NextResponse.json({ summary, rows, max: PROFILE_REMINDER_MAX });
}
