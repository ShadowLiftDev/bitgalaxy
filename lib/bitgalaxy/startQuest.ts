import { adminDb } from "@/lib/firebase-admin";
import { writeAuditLog } from "./auditLog";
import type { BitGalaxyQuest } from "./getQuests";
import { getQuest } from "./getQuest";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Marks a quest as active for the player, if not already active or completed.
 */
export async function startQuest(
  orgId: string,
  userId: string,
  questId: string,
): Promise<void> {
  if (!orgId) throw new Error("startQuest: orgId is required");
  if (!userId) throw new Error("startQuest: userId is required");
  if (!questId) throw new Error("startQuest: questId is required");

  const quest = await getQuest(orgId, questId);
  if (!quest) {
    throw new Error(`startQuest: quest ${questId} not found`);
  }
  if (!quest.isActive) {
    throw new Error(`startQuest: quest ${questId} is not active`);
  }

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(playerRef);
    if (!snap.exists) {
      throw new Error(
        `startQuest: player ${userId} does not exist in org ${orgId}`,
      );
    }

    const data = snap.data() as any;
    const activeQuestIds: string[] = data.activeQuestIds ?? [];
    const completedQuestIds: string[] = data.completedQuestIds ?? [];

    // If already completed and maxCompletionsPerUser is 1, block re-activation.
    if (
      completedQuestIds.includes(questId) &&
      (quest.maxCompletionsPerUser === 1 ||
        quest.maxCompletionsPerUser == null) // treat null as "infinite" but we'll still allow re-start if null
    ) {
      if (quest.maxCompletionsPerUser === 1) {
        throw new Error(
          `startQuest: quest ${questId} is one-time and already completed.`,
        );
      }
    }

    // Already active? Nothing to do.
    if (activeQuestIds.includes(questId)) {
      return;
    }

  const now = FieldValue.serverTimestamp();

    tx.update(playerRef, {
      activeQuestIds: [...activeQuestIds, questId],
      updatedAt: now,
    });
  });

  await writeAuditLog(orgId, userId, {
    eventType: "quest_start",
    questId,
    source: "manual",
  });
}