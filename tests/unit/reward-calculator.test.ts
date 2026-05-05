import { describe, it, expect } from "vitest";
import {
  centsToEuros,
  computeDefaultRewardCents,
} from "@/lib/reward-calculator";

describe("centsToEuros", () => {
  it("convertit 100 cents → 1 euro", () => {
    expect(centsToEuros(100)).toBe(1);
  });

  it("convertit 2550 cents → 25.5 euros", () => {
    expect(centsToEuros(2550)).toBe(25.5);
  });

  it("retourne 0 pour NaN", () => {
    expect(centsToEuros(NaN)).toBe(0);
  });

  it("retourne 0 pour Infinity", () => {
    expect(centsToEuros(Infinity)).toBe(0);
    expect(centsToEuros(-Infinity)).toBe(0);
  });

  it("preserve les centimes negatifs (annulation)", () => {
    expect(centsToEuros(-1500)).toBe(-15);
  });
});

describe("computeDefaultRewardCents — base & tier", () => {
  it("utilise baseRewardCents si pas de tier override", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 2000,
      tierRewards: null,
      tier: "standard",
      staffRating: 3,
    });
    expect(r).toBe(2000);
  });

  it("override par tier 'expert' si tierRewards.expert defini", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 2000,
      tierRewards: { standard: 2000, expert: 5000, premium: 8000 },
      tier: "expert",
      staffRating: 3,
    });
    expect(r).toBe(5000);
  });

  it("override par tier 'premium'", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 2000,
      tierRewards: { standard: 2000, expert: 5000, premium: 8000 },
      tier: "premium",
      staffRating: 3,
    });
    expect(r).toBe(8000);
  });

  it("retombe sur base si tier inconnu (string libre)", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 2000,
      tierRewards: { standard: 2000, expert: 5000 },
      tier: "tier-fictif",
      staffRating: 3,
    });
    expect(r).toBe(2000);
  });

  it("retombe sur base si tierRewards.expert vaut 0 ou est absent", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 2000,
      tierRewards: { standard: 0, expert: 0 },
      tier: "expert",
      staffRating: 3,
    });
    expect(r).toBe(2000);
  });

  it("traite baseRewardCents null comme 0", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: null,
      tierRewards: null,
      tier: "standard",
      staffRating: 3,
    });
    expect(r).toBe(0);
  });
});

describe("computeDefaultRewardCents — multiplicateur staffRating", () => {
  // Reference projet : rating 4-5 = +10%, rating 3 = neutre, rating 1-2 = -15%.
  // Toute modif de cette grille = changement de policy paiement.
  const base = { baseRewardCents: 2000, tierRewards: null, tier: "standard" } as const;

  it("rating 5 → x1.10 → 2200", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 5 })).toBe(2200);
  });

  it("rating 4 → x1.10 → 2200", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 4 })).toBe(2200);
  });

  it("rating 3 → x1 → 2000", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 3 })).toBe(2000);
  });

  it("rating 2 → x0.85 → 1700", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 2 })).toBe(1700);
  });

  it("rating 1 → x0.85 → 1700", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 1 })).toBe(1700);
  });

  it("rating 0 → traite comme <=2 → x0.85 → 1700", () => {
    expect(computeDefaultRewardCents({ ...base, staffRating: 0 })).toBe(1700);
  });
});

describe("computeDefaultRewardCents — invariants", () => {
  it("ne retourne jamais un montant negatif", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: -500,
      tierRewards: null,
      tier: "standard",
      staffRating: 1,
    });
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it("retourne un entier (centimes), pas de decimal", () => {
    const r = computeDefaultRewardCents({
      baseRewardCents: 1233,
      tierRewards: null,
      tier: "standard",
      staffRating: 2,
    });
    expect(Number.isInteger(r)).toBe(true);
  });

  it("Math.round arrondit correctement la multiplication", () => {
    // 1233 * 0.85 = 1048.05 → round → 1048
    const r = computeDefaultRewardCents({
      baseRewardCents: 1233,
      tierRewards: null,
      tier: "standard",
      staffRating: 2,
    });
    expect(r).toBe(1048);
  });
});
