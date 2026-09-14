import { describe, it, expect } from "vitest";
import {
  AVAILABILITY_REMINDER_COOLDOWN_DAYS,
  AVAILABILITY_REMINDER_MAX,
  DORMANT_AFTER_DAYS,
  engagementState,
  engagementSortBonus,
  isLastReminder,
  lastSignOfLifeAt,
  shouldAutoRemind,
  shouldPauseAfterReminders,
} from "@/lib/tester-engagement";

// Etat d'engagement calcule : « actif » ne veut dire que « profil complet »,
// cet etat dit si le testeur est reellement mobilisable. La boucle de relance
// (3 relances, puis pause) suit la meme mecanique que la relance profil.

const now = new Date("2026-09-14T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

describe("engagementState", () => {
  it("disponible si available_until est dans le futur, quelle que soit l'activite", () => {
    expect(engagementState({ created_at: daysAgo(400), available_until: daysAhead(30) }, now)).toBe("available");
    expect(engagementState({ created_at: daysAgo(1), available_until: daysAhead(90) }, now)).toBe("available");
  });

  it("une disponibilite expiree ne compte plus", () => {
    expect(engagementState({ created_at: daysAgo(10), last_seen_at: daysAgo(10), available_until: daysAgo(1) }, now)).toBe("to_remind");
  });

  it("a relancer si activite recente sans confirmation", () => {
    expect(engagementState({ created_at: daysAgo(300), last_seen_at: daysAgo(20) }, now)).toBe("to_remind");
    expect(engagementState({ created_at: daysAgo(DORMANT_AFTER_DAYS - 1) }, now)).toBe("to_remind");
  });

  it("dormant apres 6 mois sans activite ni reponse", () => {
    expect(engagementState({ created_at: daysAgo(200), last_seen_at: daysAgo(190) }, now)).toBe("dormant");
    expect(engagementState({ created_at: daysAgo(DORMANT_AFTER_DAYS) }, now)).toBe("dormant");
  });

  it("une reponse a une campagne compte comme signe de vie meme sans connexion", () => {
    const t = { created_at: daysAgo(400), last_seen_at: daysAgo(300), availability_responded_at: daysAgo(10) };
    expect(lastSignOfLifeAt(t)).toBe(t.availability_responded_at);
    expect(engagementState(t, now)).toBe("to_remind");
  });

  it("bonus de tri : +1 disponible, 0 a relancer, -1 dormant", () => {
    expect(engagementSortBonus("available")).toBe(1);
    expect(engagementSortBonus("to_remind")).toBe(0);
    expect(engagementSortBonus("dormant")).toBe(-1);
  });
});

describe("boucle de relance de disponibilite", () => {
  const base = { created_at: daysAgo(140), last_seen_at: daysAgo(138), available_until: null };

  it("jamais relance : a relancer au premier passage", () => {
    expect(shouldAutoRemind({ ...base, availability_check_count: 0, availability_check_sent_at: null }, now)).toBe(true);
    expect(shouldPauseAfterReminders({ ...base, availability_check_count: 0 }, now)).toBe(false);
  });

  it("disponible confirme : ni relance ni pause", () => {
    const t = { ...base, available_until: daysAhead(30), availability_check_count: 3, availability_check_sent_at: daysAgo(30) };
    expect(shouldAutoRemind(t, now)).toBe(false);
    expect(shouldPauseAfterReminders(t, now)).toBe(false);
  });

  it("cooldown : pas de nouvelle relance avant 14 jours", () => {
    const recent = { ...base, availability_check_count: 1, availability_check_sent_at: daysAgo(AVAILABILITY_REMINDER_COOLDOWN_DAYS - 1) };
    const due = { ...base, availability_check_count: 1, availability_check_sent_at: daysAgo(AVAILABILITY_REMINDER_COOLDOWN_DAYS) };
    expect(shouldAutoRemind(recent, now)).toBe(false);
    expect(shouldAutoRemind(due, now)).toBe(true);
  });

  it("plafond : 3 relances, la 3e est annoncee comme la derniere", () => {
    expect(isLastReminder({ ...base, availability_check_count: 0 })).toBe(false);
    expect(isLastReminder({ ...base, availability_check_count: AVAILABILITY_REMINDER_MAX - 1 })).toBe(true);
    expect(shouldAutoRemind({ ...base, availability_check_count: AVAILABILITY_REMINDER_MAX, availability_check_sent_at: daysAgo(60) }, now)).toBe(false);
  });

  it("pause : 14 jours apres la 3e relance sans reponse", () => {
    const tooSoon = { ...base, availability_check_count: 3, availability_check_sent_at: daysAgo(AVAILABILITY_REMINDER_COOLDOWN_DAYS - 1) };
    const due = { ...base, availability_check_count: 3, availability_check_sent_at: daysAgo(AVAILABILITY_REMINDER_COOLDOWN_DAYS) };
    expect(shouldPauseAfterReminders(tooSoon, now)).toBe(false);
    expect(shouldPauseAfterReminders(due, now)).toBe(true);
  });

  it("une reponse remet le compteur a zero : la boucle repart", () => {
    // Le compteur est remis a 0 par les routes de reponse ; ici on verifie
    // que 0 relance + cooldown ecoule = relance due, meme avec une ancienne
    // date de relance.
    expect(shouldAutoRemind({ ...base, availability_check_count: 0, availability_check_sent_at: daysAgo(20) }, now)).toBe(true);
  });

  it("les cas de la capture du 14/09 : inscrits en avril, jamais relances (marquage perdu) = relance 1/3", () => {
    const t = { created_at: "2026-04-29T20:38:30Z", last_seen_at: "2026-04-29T20:38:45Z", available_until: null, availability_check_sent_at: null, availability_check_count: 0 };
    expect(engagementState(t, now)).toBe("to_remind");
    expect(shouldAutoRemind(t, now)).toBe(true);
    expect(isLastReminder(t)).toBe(false);
  });
});
