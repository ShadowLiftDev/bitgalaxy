import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";

import { getRankForXP } from "./rankEngine";

export interface UpdateXPOptions {
  source?: string | null;
  questId?: string | null;
  rewardId?: string | null;
  gameId?: string | null;
  meta?: Record<string, unknown>;
}

function getLevelForXP(totalXP: number): number {
  const normalizedXP = Math.max(
    0,
    Math.floor(totalXP),
  );

  return Math.floor(normalizedXP / 1000) + 1;
}

function normalizeRequiredId(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `updateXP: ${fieldName} is required`,
    );
  }

  return normalized;
}

function normalizeFiniteNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const parsed = normalizeFiniteNumber(
    value,
    fallback,
  );

  return Math.max(0, Math.floor(parsed));
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function cleanMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!meta) {
    return null;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length
    ? cleaned
    : null;
}

/**
 * Atomically adjusts a member's BitGalaxy XP and writes
 * the corresponding immutable activity record.
 *
 * Live state:
 * members/{memberId}/orgLinks/{orgId}/modules/bitgalaxy/state/current
 *
 * History:
 * activities/{activityId}
 */
export async function updateXP(
  orgId: string,
  memberId: string,
  deltaXP: number,
  options: UpdateXPOptions = {},
): Promise<void> {
  const normalizedOrgId = normalizeRequiredId(
    orgId,
    "orgId",
  );

  const normalizedMemberId =
    normalizeRequiredId(
      memberId,
      "memberId",
    );

  if (!Number.isFinite(deltaXP)) {
    throw new Error(
      "updateXP: deltaXP must be a finite number",
    );
  }

  const normalizedDeltaXP =
    Math.trunc(deltaXP);

  if (normalizedDeltaXP === 0) {
    return;
  }

  const memberRef = adminDb
    .collection("members")
    .doc(normalizedMemberId);

  const orgLinkRef = memberRef
    .collection("orgLinks")
    .doc(normalizedOrgId);

  const stateRef = orgLinkRef
    .collection("modules")
    .doc("bitgalaxy")
    .collection("state")
    .doc("current");

  const activityRef = adminDb
    .collection("activities")
    .doc();

  const weekKey = getISOWeekKey(new Date());

  await adminDb.runTransaction(async (transaction) => {
    const [
      memberSnapshot,
      orgLinkSnapshot,
      stateSnapshot,
    ] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(orgLinkRef),
      transaction.get(stateRef),
    ]);

    if (!memberSnapshot.exists) {
      throw new Error(
        `updateXP: member ${normalizedMemberId} does not exist`,
      );
    }

    if (!orgLinkSnapshot.exists) {
      throw new Error(
        `updateXP: member ${normalizedMemberId} is not connected to org ${normalizedOrgId}`,
      );
    }

    const stateData =
      stateSnapshot.data() ?? {};

    const currentXP =
      normalizeNonNegativeInteger(
        stateData.totalXP,
        0,
      );

    const requestedNewXP =
      currentXP + normalizedDeltaXP;

    const newXP = Math.max(
      0,
      requestedNewXP,
    );

    /*
     * When subtracting more XP than the member has,
     * the actual applied change differs from the
     * requested delta.
     */
    const appliedDeltaXP =
      newXP - currentXP;

    if (appliedDeltaXP === 0) {
      return;
    }

    const newRank = getRankForXP(newXP);
    const newLevel = getLevelForXP(newXP);

    const previousWeekKey =
      typeof stateData.weeklyWeekKey === "string"
        ? stateData.weeklyWeekKey
        : "";

    const previousWeeklyXP =
      normalizeNonNegativeInteger(
        stateData.weeklyXP,
        0,
      );

    const baseWeeklyXP =
      previousWeekKey === weekKey
        ? previousWeeklyXP
        : 0;

    const newWeeklyXP = Math.max(
      0,
      baseWeeklyXP + appliedDeltaXP,
    );

    const now = FieldValue.serverTimestamp();

    transaction.set(
      stateRef,
      {
        moduleId: "bitgalaxy",
        orgId: normalizedOrgId,
        memberId: normalizedMemberId,

        totalXP: newXP,
        rank: newRank,
        level: newLevel,

        weeklyXP: newWeeklyXP,
        weeklyWeekKey: weekKey,

        updatedAt: now,

        ...(stateSnapshot.exists
          ? {}
          : {
              activeQuestIds: [],
              completedQuestIds: [],
              questCompletionCounts: {},
              createdAt: now,
            }),
      },
      {
        merge: true,
      },
    );

    const activityMeta = cleanMeta({
      ...(options.meta ?? {}),

      requestedDeltaXP:
        normalizedDeltaXP,
      appliedDeltaXP,

      previousTotalXP: currentXP,
      resultingTotalXP: newXP,

      resultingRank: newRank,
      resultingLevel: newLevel,

      weeklyWeekKey: weekKey,
      resultingWeeklyXP: newWeeklyXP,
    });

    transaction.set(activityRef, {
      activityId: activityRef.id,

      system: "bitgalaxy",
      moduleId: "bitgalaxy",

      orgId: normalizedOrgId,
      memberId: normalizedMemberId,

      eventType: "xp",
      xpChange: appliedDeltaXP,

      questId: normalizeOptionalString(
        options.questId,
      ),
      rewardId: normalizeOptionalString(
        options.rewardId,
      ),
      gameId: normalizeOptionalString(
        options.gameId,
      ),

      source: normalizeOptionalString(
        options.source,
      ),
      meta: activityMeta,

      occurredAt: now,
      createdAt: now,
    });
  });
}