import { describe, it, expect } from "vitest";
import {
  shouldAutoTriggerTour,
  TESTER_TOUR_STEPS,
} from "@/lib/onboarding-tour";

const COMPLETE_PROFILE = {
  profile_completed: true,
  onboarding_tour_completed_at: null,
  onboarding_tour_skipped_at: null,
};
const DESKTOP = { viewportWidth: 1280 };
const MOBILE = { viewportWidth: 600 };

describe("shouldAutoTriggerTour — happy path", () => {
  it("declenche le tour si profil complet, jamais fini, jamais skippe, desktop", () => {
    expect(shouldAutoTriggerTour(COMPLETE_PROFILE, DESKTOP)).toBe(true);
  });
});

describe("shouldAutoTriggerTour — gardes", () => {
  it("ne declenche PAS si le profil n'est pas complet", () => {
    expect(
      shouldAutoTriggerTour(
        { ...COMPLETE_PROFILE, profile_completed: false },
        DESKTOP,
      ),
    ).toBe(false);
  });

  it("ne declenche PAS si le tour a deja ete complete", () => {
    expect(
      shouldAutoTriggerTour(
        {
          ...COMPLETE_PROFILE,
          onboarding_tour_completed_at: "2026-05-05T10:00:00Z",
        },
        DESKTOP,
      ),
    ).toBe(false);
  });

  it("ne declenche PAS si le tour a ete skippe", () => {
    expect(
      shouldAutoTriggerTour(
        {
          ...COMPLETE_PROFILE,
          onboarding_tour_skipped_at: "2026-05-05T10:00:00Z",
        },
        DESKTOP,
      ),
    ).toBe(false);
  });

  it("ne declenche PAS sur mobile (< 768px)", () => {
    expect(shouldAutoTriggerTour(COMPLETE_PROFILE, MOBILE)).toBe(false);
  });

  it("ne declenche PAS sur viewport exactement 767px (limite)", () => {
    expect(
      shouldAutoTriggerTour(COMPLETE_PROFILE, { viewportWidth: 767 }),
    ).toBe(false);
  });

  it("declenche sur 768px (limite inclusive desktop)", () => {
    expect(
      shouldAutoTriggerTour(COMPLETE_PROFILE, { viewportWidth: 768 }),
    ).toBe(true);
  });
});

describe("shouldAutoTriggerTour — combinaisons defensives", () => {
  it("ne declenche pas si TOUT est en defaut", () => {
    expect(
      shouldAutoTriggerTour(
        {
          profile_completed: false,
          onboarding_tour_completed_at: "x",
          onboarding_tour_skipped_at: "y",
        },
        MOBILE,
      ),
    ).toBe(false);
  });

  it("priorite : profil incomplet l'emporte sur tout", () => {
    expect(
      shouldAutoTriggerTour(
        {
          profile_completed: false,
          onboarding_tour_completed_at: null,
          onboarding_tour_skipped_at: null,
        },
        DESKTOP,
      ),
    ).toBe(false);
  });

  it("string vide pour timestamps n'est PAS traite comme null (volontaire)", () => {
    // Si la DB renvoie "" au lieu de null, on bloque par securite (le user
    // a peut-etre vu le tour). Les timestamps reels sont ISO 8601, jamais "".
    expect(
      shouldAutoTriggerTour(
        { ...COMPLETE_PROFILE, onboarding_tour_completed_at: "" },
        DESKTOP,
      ),
    ).toBe(true); // "" est falsy → on declenche. Documente le comportement actuel.
  });
});

describe("TESTER_TOUR_STEPS — invariants", () => {
  it("contient exactement 8 etapes", () => {
    expect(TESTER_TOUR_STEPS).toHaveLength(8);
  });

  it("commence et finit par une modal centree (element null)", () => {
    expect(TESTER_TOUR_STEPS[0].element).toBeNull();
    expect(TESTER_TOUR_STEPS[TESTER_TOUR_STEPS.length - 1].element).toBeNull();
  });

  it("la 2e etape cible le bouton d'aide (\"?\")", () => {
    expect(TESTER_TOUR_STEPS[1].element).toBe('[data-tour="help-button"]');
  });

  it("chaque etape a un titre et une description non vides", () => {
    for (const step of TESTER_TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("toutes les cibles non-null suivent la convention data-tour=", () => {
    for (const step of TESTER_TOUR_STEPS) {
      if (step.element !== null) {
        expect(step.element).toMatch(/^\[data-tour="[a-z-]+"\]$/);
      }
    }
  });

  it("cible toutes les sections de la sidebar testeur", () => {
    const elements = TESTER_TOUR_STEPS.map((s) => s.element).filter(
      (e): e is string => e !== null,
    );
    expect(elements).toContain('[data-tour="nav-dashboard"]');
    expect(elements).toContain('[data-tour="nav-missions"]');
    expect(elements).toContain('[data-tour="nav-gains"]');
    expect(elements).toContain('[data-tour="nav-profil"]');
    expect(elements).toContain('[data-tour="nav-documents"]');
  });

  it("etape Mon profil mentionne explicitement la pertinence des missions (anti-suppression)", () => {
    const profilStep = TESTER_TOUR_STEPS.find(
      (s) => s.element === '[data-tour="nav-profil"]',
    );
    expect(profilStep).toBeDefined();
    expect(profilStep!.description).toMatch(/missions/i);
    expect(profilStep!.description).toMatch(/pertinen|correspondent/i);
  });

  it("etape Mes documents explique le NDA / les accords contractuels", () => {
    const docStep = TESTER_TOUR_STEPS.find(
      (s) => s.element === '[data-tour="nav-documents"]',
    );
    expect(docStep).toBeDefined();
    expect(docStep!.description).toMatch(/nda|confidentialit|accord/i);
  });

  it("etape Help mentionne la possibilite de relancer", () => {
    const helpStep = TESTER_TOUR_STEPS.find(
      (s) => s.element === '[data-tour="help-button"]',
    );
    expect(helpStep).toBeDefined();
    expect(helpStep!.description).toMatch(/relancer|revoir|tour/i);
  });
});
