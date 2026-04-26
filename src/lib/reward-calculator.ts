/**
 * Calcul remuneration par defaut (centimes). Override possible cote staff avant paiement.
 *
 * IMPORTANT - Conventions d'unites monetaires :
 * - `tester_payouts.calculated_amount_cents` / `final_amount_cents`           : CENTIMES (INTEGER)
 * - `projects.base_reward_cents`, `projects.tier_rewards.{standard,expert,premium}` : CENTIMES (INTEGER)
 * - `testers.total_earned`                                                    : EUROS (NUMERIC, decimale)
 *
 * La colonne `total_earned` est en EUROS par convention historique (BUG #15).
 * Toujours convertir avec `centsToEuros()` avant d'incrementer.
 */
export type TesterTier = "standard" | "expert" | "premium" | string;

/**
 * Convertit des centimes vers des euros (decimal). A utiliser pour incrementer
 * `testers.total_earned` qui est stocke en EUROS, contrairement aux autres montants
 * de la base qui sont tous en centimes.
 */
export function centsToEuros(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

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
