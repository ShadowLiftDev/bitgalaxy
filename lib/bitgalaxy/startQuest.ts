import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

import { getQuest } from "./getQuest";

/**
 * Marks a normal BitGalaxy quest as active for a member.
 *
 * Arcade quests are launched through their game pages.
 * Check-in quests are handled through the check-in endpoint.
 *
 * Live state:
 * members/{memberId}/orgLinks/{orgId}/modules/bitgalaxy/state/current
 *
 * History:
 * activities/{activityId}
 */
export async function startQuest(
  orgId: string,
  memberId: string,
  questId: string,
): Promise<void> {
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
      `startQuest: quest ${normalizedQuestId} not found`,
    );
  }

  if (!quest.isActive) {
    throw new Error(
      `startQuest: quest ${normalizedQuestId} is not active`,
    );
  }

  if (quest.type === "arcade") {
    throw new Error(
      "startQuest: arcade quests are started through their game page",
    );
  }

  if (quest.type === "checkin") {
    throw new Error(
      "startQuest: check-in quests are completed through the check-in endpoint",
    );
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
        `startQuest: member ${normalizedMemberId} does not exist`,
      );
    }

    if (!orgLinkSnapshot.exists) {
      throw new Error(
        `startQuest: member ${normalizedMemberId} is not connected to org ${normalizedOrgId}`,
      );
    }

    const stateData =
      stateSnapshot.data() ?? {};

    const activeQuestIds = normalizeStringArray(
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

    if (
      activeQuestIds.includes(
        normalizedQuestId,
      )
    ) {
      return;
    }

    const completionCount =
      completionCounts[normalizedQuestId] ?? 0;

    const completionLimit =
      normalizeCompletionLimit(
        quest.maxCompletionsPerUser,
      );

    if (
      completionLimit !== null &&
      completionCount >= completionLimit
    ) {
      throw new Error(
        `startQuest: quest ${normalizedQuestId} has reached its completion limit`,
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.set(
      stateRef,
      {
        moduleId: "bitgalaxy",
        orgId: normalizedOrgId,
        memberId: normalizedMemberId,

        activeQuestIds: [
          ...activeQuestIds,
          normalizedQuestId,
        ],

        completedQuestIds,
        questCompletionCounts:
          completionCounts,

        updatedAt: now,

        ...(stateSnapshot.exists
          ? {}
          : {
              totalXP: 0,
              level: 1,
              rank: "Rookie",
              weeklyXP: 0,
              weeklyWeekKey: "",
              createdAt: now,
            }),
      },
      {
        merge: true,
      },
    );

    transaction.set(activityRef, {
      activityId: activityRef.id,

      system: "bitgalaxy",
      moduleId: "bitgalaxy",

      orgId: normalizedOrgId,
      memberId: normalizedMemberId,

      eventType: "quest_start",
      xpChange: null,

      questId: normalizedQuestId,
      rewardId: null,
      gameId: null,

      source: "manual",
      meta: {
        questType: quest.type,
      },

      occurredAt: now,
      createdAt: now,
    });
  });
}

function normalizeRequiredId(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `startQuest: ${fieldName} is required`,
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