export type IntegrationEventType =
  | "quest_complete"
  | "checkin"
  | "xp_awarded";

export interface IntegrationContext {
  eventType: IntegrationEventType;
  orgId: string;
  userId: string;
  questId?: string | null;
  xpChange?: number;
  // room for more metadata later (referralId, rewardId, etc.)
  meta?: Record<string, any>;
}

/**
 * Hook for cross-app integrations (Referralink, RewardCircle, Directory).
 * For v1, this is a safe no-op that can be expanded later without
 * touching BitGalaxy's core quest engine.
 */
export async function applyIntegrations(
  _ctx: IntegrationContext,
): Promise<void> {
  // v1: intentionally do nothing.
  // Later, we can:
  // - increment Referralink referrals
  // - trigger RewardCircle reward issuance
  // - push events into Directory/NeonMatrix streams
  return;
}