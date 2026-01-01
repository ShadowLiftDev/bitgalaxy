export type RankName =
  | "Underdog"
  | "Rookie"
  | "Bounty Hunter"
  | "Maverick"
  | "Legend";

export interface RankTier {
  name: RankName;
  minXP: number;
  maxXP: number;
}

export const RANK_TIERS: RankTier[] = [
  { name: "Underdog", minXP: 0, maxXP: 999 },
  { name: "Rookie", minXP: 1000, maxXP: 14_999 },
  { name: "Bounty Hunter", minXP: 15_000, maxXP: 39_999 },
  { name: "Maverick", minXP: 40_000, maxXP: 74_999 },
  { name: "Legend", minXP: 75_000, maxXP: Number.MAX_SAFE_INTEGER },
];

// ✅ Multi-level system (global levels)
export const LEVEL_STEP_XP = 1000;

export function getRankForXP(totalXP: number): RankName {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  const tier =
    RANK_TIERS.find((t) => xp >= t.minXP && xp <= t.maxXP) ?? RANK_TIERS[0];
  return tier.name;
}

export function getLevelForXP(totalXP: number): number {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  return Math.floor(xp / LEVEL_STEP_XP) + 1; // Level 1 starts at 0 XP
}

export function getLevelProgress(totalXP: number) {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  const level = getLevelForXP(xp);

  const levelMinXP = (level - 1) * LEVEL_STEP_XP;
  const levelMaxXP = level * LEVEL_STEP_XP - 1;

  const span = LEVEL_STEP_XP || 1;
  const progressInLevel = xp - levelMinXP;
  const percent = Math.min(100, Math.max(0, (progressInLevel / span) * 100));

  return {
    level,
    levelMinXP,
    levelMaxXP,
    levelProgressPercent: percent,
  };
}

export function getRankProgress(totalXP: number) {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  const tier =
    RANK_TIERS.find((t) => xp >= t.minXP && xp <= t.maxXP) ?? RANK_TIERS[0];

  const span = tier.maxXP - tier.minXP || 1;
  const progressInTier = xp - tier.minXP;
  const percent = Math.min(100, Math.max(0, (progressInTier / span) * 100));

  const levelInfo = getLevelProgress(xp);

  return {
    rank: tier.name,
    currentXP: xp,
    tierMinXP: tier.minXP,
    tierMaxXP: tier.maxXP,
    progressPercent: percent,

    // ✅ include level details
    ...levelInfo,
  };
}