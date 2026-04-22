/**
 * Calcul remuneration par defaut (centimes). Override possible cote staff avant paiement.
 */
export type TesterTier = "standard" | "expert" | "premium" | string;

export interface TierRewardsMap {
  standard?: number;
  expert?: number;
  premium?: number;
}

export function computeDefaultRewardCents(params: {
  baseRewardCents: number | null;
  tierRewards: TierRewardsMap | null;
  tier: TesterTier;
  staffRating: number;
}): number {
  let base = params.baseRewardCents ?? 0;
  const tr = params.tierRewards;
  if (tr && typeof tr === "object") {
    const tierKey = params.tier as keyof TierRewardsMap;
    if (tierKey && typeof tr[tierKey] === "number" && tr[tierKey]! > 0) {
      base = tr[tierKey]!;
    }
  }

  const r = params.staffRating;
  let mult = 1;
  if (r >= 4) mult = 1.1;
  else if (r === 3) mult = 1;
  else if (r <= 2) mult = 0.85;

  return Math.max(0, Math.round(base * mult));
}
