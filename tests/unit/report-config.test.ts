import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeReadableTesterId,
  computeAge,
  computeDeviceSummary,
  GENDER_EXPORT_LABELS,
  DIGITAL_LEVEL_LABELS,
} from "@/lib/report-config";

// Ces helpers alimentent l'export ET la nouvelle vue rapport (panel T01…,
// âge, device). On verrouille leur comportement pour éviter toute régression
// sur le livrable client.

describe("computeReadableTesterId — IDs lisibles du panel", () => {
  it("commence à T01 (index 0)", () => {
    expect(computeReadableTesterId(0)).toBe("T01");
    expect(computeReadableTesterId(1)).toBe("T02");
  });
  it("padde sur 2 chiffres puis s'étend", () => {
    expect(computeReadableTesterId(9)).toBe("T10");
    expect(computeReadableTesterId(98)).toBe("T99");
    expect(computeReadableTesterId(99)).toBe("T100");
  });
});

describe("computeAge — âge à partir de la date de naissance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("retourne null si absent ou invalide", () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge("pas-une-date")).toBeNull();
  });
  it("calcule l'âge quand l'anniversaire est déjà passé cette année", () => {
    expect(computeAge("1990-01-01")).toBe(36);
  });
  it("retire 1 an si l'anniversaire n'est pas encore passé", () => {
    // Anniversaire au 31/12 → pas encore passé le 13/07.
    expect(computeAge("1990-12-31")).toBe(35);
  });
  it("gère le jour exact de l'anniversaire", () => {
    expect(computeAge("2000-07-13")).toBe(26);
  });
});

describe("computeDeviceSummary — résumé de configuration", () => {
  it("concatène appareils, modèle, OS et navigateurs", () => {
    expect(
      computeDeviceSummary({ devices: ["iPhone"], phone_model: "iPhone 15", mobile_os: "iOS", browsers: ["Safari"] })
    ).toBe("iPhone · iPhone 15 · iOS · Safari");
  });
  it("ignore les champs vides", () => {
    expect(computeDeviceSummary({ devices: ["PC Windows"], browsers: ["Chrome", "Firefox"] }))
      .toBe("PC Windows · Chrome, Firefox");
  });
  it("retourne 'Non renseigné' si rien", () => {
    expect(computeDeviceSummary({})).toBe("Non renseigné");
  });
});

describe("labels d'export", () => {
  it("mappe le genre (prefer_not_to_say → 'Non précisé')", () => {
    expect(GENDER_EXPORT_LABELS.female).toBe("Femme");
    expect(GENDER_EXPORT_LABELS.prefer_not_to_say).toBe("Non précisé");
  });
  it("mappe le niveau digital (debutant → Novice)", () => {
    expect(DIGITAL_LEVEL_LABELS.debutant).toBe("Novice");
    expect(DIGITAL_LEVEL_LABELS.expert).toBe("Expert");
  });
});
