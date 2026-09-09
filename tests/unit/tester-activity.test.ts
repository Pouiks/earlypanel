import { describe, it, expect } from "vitest";
import {
  shouldStampSeen,
  lastActivityAt,
  daysSince,
  formatLastSeen,
  activityFilterToOr,
  isPastRgpdRetention,
  RGPD_RETENTION_DAYS,
} from "@/lib/tester-activity";

const NOW = new Date("2026-09-09T10:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

describe("shouldStampSeen — au plus une écriture par heure", () => {
  it("horodate si jamais vu ou si la valeur est illisible", () => {
    expect(shouldStampSeen(null, NOW)).toBe(true);
    expect(shouldStampSeen(undefined, NOW)).toBe(true);
    expect(shouldStampSeen("pas une date", NOW)).toBe(true);
  });
  it("n'horodate pas si vu il y a moins d'une heure", () => {
    expect(shouldStampSeen(ago(59 * 60 * 1000), NOW)).toBe(false);
  });
  it("horodate à partir d'une heure", () => {
    expect(shouldStampSeen(ago(60 * 60 * 1000), NOW)).toBe(true);
    expect(shouldStampSeen(ago(3 * DAY), NOW)).toBe(true);
  });
});

describe("lastActivityAt — dernière requête, sinon connexion, sinon inscription", () => {
  const created = ago(400 * DAY);
  it("préfère last_seen_at", () => {
    expect(lastActivityAt({ last_seen_at: ago(DAY), last_login_at: ago(2 * DAY), created_at: created })).toBe(ago(DAY));
  });
  it("retombe sur last_login_at puis created_at", () => {
    expect(lastActivityAt({ last_seen_at: null, last_login_at: ago(2 * DAY), created_at: created })).toBe(ago(2 * DAY));
    expect(lastActivityAt({ last_seen_at: null, last_login_at: null, created_at: created })).toBe(created);
  });
});

describe("formatLastSeen — libellés courts", () => {
  it("jamais / aujourd'hui / hier / jours / mois / ans", () => {
    expect(formatLastSeen(null, NOW)).toBe("jamais");
    expect(formatLastSeen(ago(2 * 60 * 60 * 1000), NOW)).toBe("aujourd'hui");
    expect(formatLastSeen(ago(DAY + 1000), NOW)).toBe("hier");
    expect(formatLastSeen(ago(12 * DAY), NOW)).toBe("il y a 12 j");
    expect(formatLastSeen(ago(95 * DAY), NOW)).toBe("il y a 3 mois");
    expect(formatLastSeen(ago(400 * DAY), NOW)).toBe("il y a 1 an");
    expect(formatLastSeen(ago(800 * DAY), NOW)).toBe("il y a 2 ans");
  });
  it("daysSince ne devient jamais négatif (horloge client en avance)", () => {
    expect(daysSince(new Date(NOW.getTime() + DAY).toISOString(), NOW)).toBe(0);
  });
});

describe("activityFilterToOr — clause PostgREST", () => {
  it("aucun filtre → null ; valeur inconnue → null", () => {
    expect(activityFilterToOr("", NOW)).toBeNull();
    expect(activityFilterToOr("foo", NOW)).toBeNull();
  });
  it("jamais connectés = last_seen_at NULL", () => {
    expect(activityFilterToOr("never", NOW)).toBe("last_seen_at.is.null");
  });
  it("inactifs > 90 j : vu avant la borne, OU jamais vu ET inscrit avant la borne", () => {
    const cutoff = new Date(NOW.getTime() - 90 * DAY).toISOString();
    expect(activityFilterToOr("inactive_90", NOW)).toBe(
      `last_seen_at.lt."${cutoff}",and(last_seen_at.is.null,created_at.lt."${cutoff}")`,
    );
  });
  it("rgpd = 3 ans, aligné sur la politique de confidentialité", () => {
    expect(RGPD_RETENTION_DAYS).toBe(1095);
    const cutoff = new Date(NOW.getTime() - 1095 * DAY).toISOString();
    expect(activityFilterToOr("rgpd", NOW)).toContain(`last_seen_at.lt."${cutoff}"`);
  });
});

describe("isPastRgpdRetention", () => {
  it("vrai au-delà de 3 ans sans activité, faux sinon", () => {
    expect(isPastRgpdRetention({ last_seen_at: ago(1100 * DAY), created_at: ago(1200 * DAY) }, NOW)).toBe(true);
    expect(isPastRgpdRetention({ last_seen_at: ago(1000 * DAY), created_at: ago(1200 * DAY) }, NOW)).toBe(false);
    expect(isPastRgpdRetention({ last_seen_at: null, last_login_at: null, created_at: ago(1100 * DAY) }, NOW)).toBe(true);
  });
});
