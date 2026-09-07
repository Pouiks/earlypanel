import { describe, it, expect } from "vitest";
import {
  describeReminderState,
  PROFILE_REMINDER_AFTER_DAYS,
  PROFILE_REMINDER_COOLDOWN_DAYS,
  PROFILE_REMINDER_MAX,
} from "@/lib/profile-reminder";

// Machine a etats des relances profil : c'est ce que la page staff affiche
// et ce que le cron applique. On fige les frontieres (J+2, +5j, plafond 3).

const NOW = new Date("2026-09-10T09:00:00Z");
const daysBefore = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

function tester(over: Record<string, unknown> = {}) {
  return { id: "t1", email: "a@b.fr", status: "pending", profile_completed: false, created_at: daysBefore(10), profile_reminder_count: 0, profile_reminder_sent_at: null, ...over };
}

describe("describeReminderState", () => {
  it("trop recent avant J+2, puis due", () => {
    const fresh = describeReminderState(tester({ created_at: daysBefore(1) }), NOW);
    expect(fresh.kind).toBe("too_recent");
    expect(fresh.next_at).toBe(new Date(new Date(daysBefore(1)).getTime() + PROFILE_REMINDER_AFTER_DAYS * 86_400_000).toISOString());
    expect(describeReminderState(tester({ created_at: daysBefore(3) }), NOW).kind).toBe("due");
  });

  it("cooldown apres une relance recente, due une fois les 5 jours passes", () => {
    const recent = describeReminderState(tester({ profile_reminder_count: 1, profile_reminder_sent_at: daysBefore(2) }), NOW);
    expect(recent.kind).toBe("cooldown");
    expect(recent.count).toBe(1);
    const old = describeReminderState(tester({ profile_reminder_count: 1, profile_reminder_sent_at: daysBefore(PROFILE_REMINDER_COOLDOWN_DAYS + 1) }), NOW);
    expect(old.kind).toBe("due");
  });

  it("plafond atteint : exhausted avec date de pause = derniere relance + 5j", () => {
    const st = describeReminderState(tester({ profile_reminder_count: PROFILE_REMINDER_MAX, profile_reminder_sent_at: daysBefore(1) }), NOW);
    expect(st.kind).toBe("exhausted");
    expect(st.next_at).toBe(new Date(new Date(daysBefore(1)).getTime() + PROFILE_REMINDER_COOLDOWN_DAYS * 86_400_000).toISOString());
  });

  it("inactive = paused, sans prochaine action", () => {
    const st = describeReminderState(tester({ status: "inactive", profile_reminder_count: 3 }), NOW);
    expect(st).toEqual({ kind: "paused", next_at: null, count: 3 });
  });

  it("jamais plus d'une relance tous les 5 jours : la veille du cooldown reste en cooldown", () => {
    const st = describeReminderState(tester({ profile_reminder_count: 2, profile_reminder_sent_at: daysBefore(PROFILE_REMINDER_COOLDOWN_DAYS - 0.5) }), NOW);
    expect(st.kind).toBe("cooldown");
  });
});
