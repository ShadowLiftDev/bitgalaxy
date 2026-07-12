import { adminDb } from "@/lib/firebase-admin";

import { getQuest } from "./getQuest";
import type { BitGalaxyQuest } from "./getQuests";

export async function getActiveQuests(
  orgId: string,
  memberId: string,
): Promise<BitGalaxyQuest[]> {
  const normalizedOrgId = normalizeRequiredId(
    orgId,
    "orgId",
  );

  const normalizedMemberId = normalizeRequiredId(
    memberId,
    "memberId",
  );

  const stateRef = adminDb
    .collection("members")
    .doc(normalizedMemberId)
    .collection("orgLinks")
    .doc(normalizedOrgId)
    .collection("modules")
    .doc("bitgalaxy")
    .collection("state")
    .doc("current");

  const stateSnapshot = await stateRef.get();

  if (!stateSnapshot.exists) {
    return [];
  }

  const stateData = stateSnapshot.data() ?? {};

  const activeQuestIds = normalizeStringArray(
    stateData.activeQuestIds,
  );

  if (activeQuestIds.length === 0) {
    return [];
  }

  const questResults = await Promise.all(
    activeQuestIds.map((questId) =>
      getQuest(normalizedOrgId, questId),
    ),
  );

  return questResults.filter(
    (quest): quest is BitGalaxyQuest =>
      quest !== null &&
      quest.isActive === true,
  );
}

function normalizeRequiredId(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `getActiveQuests: ${fieldName} is required`,
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