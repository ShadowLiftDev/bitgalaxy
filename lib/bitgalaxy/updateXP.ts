import { adminDb } from "@/lib/firebase-admin";
import { getRankForXP } from "./rankEngine";
import { writeAuditLog } from "./auditLog";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getISOWeekKey } from "@/lib/weekKey";

export interface UpdateXPOptions {
  source?: string;
  questId?: string | null;
  rewardId?: string | null;
  meta?: Record<string, any>;
}

function getLevelForXP(totalXP: number): number {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  // simple, readable: 1 level per 1,000 XP
  return Math.floor(xp / 1000) + 1;
}

/**
 * Atomically adjusts a player's XP and updates:
 * - totalXP
 * - rank
 * - level
 * - weeklyXP (auto-resets on week change)
 * - weeklyWeekKey
 * Also writes an XP audit log entry.
 */
export async function updateXP(
  orgId: string,
  userId: string,
  deltaXP: number,
  options: UpdateXPOptions = {},
): Promise<void> {
  if (!orgId) throw new Error("updateXP: orgId is required");
  if (!userId) throw new Error("updateXP: userId is required");
  if (!Number.isFinite(deltaXP)) {
    throw new Error("updateXP: deltaXP must be a finite number");
  }

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  const weekKey = getISOWeekKey(new Date());

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(playerRef);

    if (!snap.exists) {
      throw new Error(`updateXP: player ${userId} does not exist in org ${orgId}`);
    }

    const data = snap.data() as any;

    const currentXP = Number(data.totalXP || 0);
    const newXP = Math.max(0, currentXP + deltaXP);

    const newRank = getRankForXP(newXP);
    const newLevel = getLevelForXP(newXP);

    const prevWeekKey = String(data.weeklyWeekKey || "");
    const prevWeeklyXP = Number(data.weeklyXP || 0);

    const baseWeekly = prevWeekKey === weekKey ? prevWeeklyXP : 0;
    const newWeeklyXP = Math.max(0, baseWeekly + deltaXP);

    const now = FieldValue.serverTimestamp() as Timestamp;

    tx.update(playerRef, {
      totalXP: newXP,
      rank: newRank,
      level: newLevel,
      weeklyXP: newWeeklyXP,
      weeklyWeekKey: weekKey,
      updatedAt: now,
    });
  });

  if (deltaXP !== 0) {
    await writeAuditLog(orgId, userId, {
      eventType: "xp",
      xpChange: deltaXP,
      questId: options.questId ?? null,
      rewardId: options.rewardId ?? null,
      source: options.source,
      meta: {
        ...(options.meta ?? {}),
        weeklyWeekKey: weekKey,
      },
    });
  }
}