import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";

import { getQuest } from "./getQuest";
import { getRankForXP } from "./rankEngine";

export interface CompleteQuestResult {
  actuallyCompleted: boolean;
  xpAwarded: number;
  completionCount: number;
  completionLimit: number | null;
}

/**
 * Completes a BitGalaxy quest and atomically updates:
 *
 * - activeQuestIds
 * - completedQuestIds
 * - questCompletionCounts
 * - totalXP
 * - rank
 * - level
 * - weeklyXP
 * - weeklyWeekKey
 * - immutable activity history
 *
 * Normal quests must already be active.
 * Arcade and check-in quests may complete directly.
 */
export async function completeQuest(
  orgId: string,
  memberId: string,
  questId: string,
): Promise<CompleteQuestResult> {
  const normalizedOrgId = normalizeRequiredId(
    orgId,
    "orgId",
  );

  const normalizedMemberId = normalizeRequiredId(
    memberId,
    "memberId",
  );

  const normalizedQuestId = normalizeRequiredId(
    questId,
    "questId",
  );

  const quest = await getQuest(
    normalizedOrgId,
    normalizedQuestId,
  );

  if (!quest) {
    throw new Error(
      `completeQuest: quest ${normalizedQuestId} not found`,
    );
  }

  if (!quest.isActive) {
    throw new Error(
      `completeQuest: quest ${normalizedQuestId} is not active`,
    );
  }

  const isArcadeQuest =
    quest.type === "arcade";

  const isCheckinQuest =
    quest.type === "checkin";

  const canCompleteDirectly =
    isArcadeQuest || isCheckinQuest;

  const configuredXP =
    normalizeNonNegativeInteger(
      quest.xp,
      0,
    );

  const completionLimit =
    normalizeCompletionLimit(
      quest.maxCompletionsPerUser,
    );

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

  return adminDb.runTransaction(
    async (
      transaction,
    ): Promise<CompleteQuestResult> => {
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
          `completeQuest: member ${normalizedMemberId} does not exist`,
        );
      }

      if (!orgLinkSnapshot.exists) {
        throw new Error(
          `completeQuest: member ${normalizedMemberId} is not connected to org ${normalizedOrgId}`,
        );
      }

      const stateData =
        stateSnapshot.data() ?? {};

      const activeQuestIds =
        normalizeStringArray(
          stateData.activeQuestIds,
        );

      const completedQuestIds =
        normalizeStringArray(
          stateData.completedQuestIds,
        );

      const completionCounts =
        normalizeCompletionCounts(
          stateData.questCompletionCounts,
        );

      const currentCompletionCount =
        completionCounts[
          normalizedQuestId
        ] ?? 0;

      const questIsActive =
        activeQuestIds.includes(
          normalizedQuestId,
        );

      /*
       * Normal quests must have been started.
       * Arcade and check-in quests may complete directly.
       */
      if (
        !canCompleteDirectly &&
        !questIsActive
      ) {
        return {
          actuallyCompleted: false,
          xpAwarded: 0,
          completionCount:
            currentCompletionCount,
          completionLimit,
        };
      }

      /*
       * A configured null limit means unlimited.
       * A positive number enforces a maximum.
       */
      if (
        completionLimit !== null &&
        currentCompletionCount >=
          completionLimit
      ) {
        return {
          actuallyCompleted: false,
          xpAwarded: 0,
          completionCount:
            currentCompletionCount,
          completionLimit,
        };
      }

      const nextCompletionCount =
        currentCompletionCount + 1;

      const nextCompletionCounts = {
        ...completionCounts,
        [normalizedQuestId]:
          nextCompletionCount,
      };

      const nextCompletedQuestIds =
        completedQuestIds.includes(
          normalizedQuestId,
        )
          ? completedQuestIds
          : [
              ...completedQuestIds,
              normalizedQuestId,
            ];

      const nextActiveQuestIds =
        canCompleteDirectly
          ? activeQuestIds
          : activeQuestIds.filter(
              (id) =>
                id !== normalizedQuestId,
            );

      const currentXP =
        normalizeNonNegativeInteger(
          stateData.totalXP,
          0,
        );

      const newXP =
        currentXP + configuredXP;

      const newRank =
        getRankForXP(newXP);

      const newLevel =
        getLevelForXP(newXP);

      const previousWeekKey =
        typeof stateData.weeklyWeekKey ===
        "string"
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

      const newWeeklyXP =
        baseWeeklyXP + configuredXP;

      const now =
        FieldValue.serverTimestamp();

      transaction.set(
        stateRef,
        {
          moduleId: "bitgalaxy",
          orgId: normalizedOrgId,
          memberId: normalizedMemberId,

          activeQuestIds:
            nextActiveQuestIds,
          completedQuestIds:
            nextCompletedQuestIds,
          questCompletionCounts:
            nextCompletionCounts,

          totalXP: newXP,
          rank: newRank,
          level: newLevel,

          weeklyXP: newWeeklyXP,
          weeklyWeekKey: weekKey,

          ...(isCheckinQuest
            ? {
                lastCheckinAt: now,
              }
            : {}),

          updatedAt: now,

          ...(stateSnapshot.exists
            ? {}
            : {
                createdAt: now,
              }),
        },
        {
          merge: true,
        },
      );

      const eventType = isArcadeQuest
        ? "arcade_complete"
        : isCheckinQuest
          ? "checkin"
          : "quest_complete";

      transaction.set(activityRef, {
        activityId: activityRef.id,

        system: "bitgalaxy",
        moduleId: "bitgalaxy",

        orgId: normalizedOrgId,
        memberId: normalizedMemberId,

        eventType,
        xpChange: configuredXP,

        questId: normalizedQuestId,
        rewardId: null,
        gameId: isArcadeQuest
          ? normalizedQuestId
          : null,

        source: quest.type,

        meta: {
          questType: quest.type,

          completionCount:
            nextCompletionCount,
          completionLimit,

          previousTotalXP: currentXP,
          resultingTotalXP: newXP,

          resultingRank: newRank,
          resultingLevel: newLevel,

          weeklyWeekKey: weekKey,
          resultingWeeklyXP:
            newWeeklyXP,
        },

        occurredAt: now,
        createdAt: now,
      });

      return {
        actuallyCompleted: true,
        xpAwarded: configuredXP,
        completionCount:
          nextCompletionCount,
        completionLimit,
      };
    },
  );
}

function normalizeRequiredId(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `completeQuest: ${fieldName} is required`,
    );
  }

  return normalized;
}

function normalizeStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeCompletionCounts(
  value: unknown,
): Record<string, number> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const normalized: Record<string, number> =
    {};

  for (const [key, count] of Object.entries(
    value,
  )) {
    const parsed = Number(count);

    if (
      key.trim() &&
      Number.isFinite(parsed) &&
      parsed >= 0
    ) {
      normalized[key] = Math.floor(parsed);
    }
  }

  return normalized;
}

function normalizeCompletionLimit(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.floor(parsed);

  return normalized > 0
    ? normalized
    : null;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getLevelForXP(
  totalXP: number,
): number {
  const normalizedXP = Math.max(
    0,
    Math.floor(totalXP),
  );

  return (
    Math.floor(normalizedXP / 1000) + 1
  );
}