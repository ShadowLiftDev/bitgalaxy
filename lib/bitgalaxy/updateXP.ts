import { adminDb } from "@/lib/firebase-admin";
import { getRankForXP } from "./rankEngine";
import { FieldValue } from "firebase-admin/firestore";
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

function cleanMeta(meta?: Record<string, any>) {
  const cleaned: Record<string, any> = {};
  if (!meta) return cleaned;
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined) cleaned[k] = v;
  }
  return cleaned;
}

/**
 * Atomically adjusts a player's XP and updates:
 * - totalXP
 * - rank
 * - level
 * - weeklyXP (auto-resets on week change)
 * - weeklyWeekKey
 *
 * ALSO writes an XP audit log entry in the same transaction
 * so you never get "XP changed but no history record".
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

  // No-op: don't write player updates or history
  if (deltaXP === 0) return;

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  const weekKey = getISOWeekKey(new Date());

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(playerRef);
    if (!snap.exists) {
      throw new Error(
        `updateXP: player ${userId} does not exist in org ${orgId}`,
      );
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

    const now = FieldValue.serverTimestamp();

    // ✅ Player update
    tx.update(playerRef, {
      totalXP: newXP,
      rank: newRank,
      level: newLevel,
      weeklyXP: newWeeklyXP,
      weeklyWeekKey: weekKey,
      updatedAt: now,
    });

    // ✅ Atomic history log entry
    const historyRef = playerRef.collection("history").doc();

    const meta = cleanMeta({
      ...(options.meta ?? {}),
      weeklyWeekKey: weekKey,
      // optional but useful to query history later:
      resultingTotalXP: newXP,
      resultingRank: newRank,
      resultingLevel: newLevel,
    });

    tx.set(historyRef, {
      eventType: "xp",
      xpChange: deltaXP,
      questId: options.questId ?? null,
      rewardId: options.rewardId ?? null,
      source: options.source ?? null,
      meta: Object.keys(meta).length ? meta : null,
      timestamp: now,
    });
  });
}