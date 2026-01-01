import { adminDb } from "@/lib/firebase-admin";
import { getQuest } from "./getQuest";
import { writeAuditLog } from "./auditLog";
import { updateXP } from "./updateXP";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Completes a quest for a player:
 * - Normal quests: must be in activeQuestIds, then moved to completedQuestIds.
 * - Arcade quests: can be completed directly (no activeQuestIds required).
 * - Checkin quests: can be completed directly (no activeQuestIds required).
 *
 * Returns whether the quest was actually completed (i.e., XP eligible) and how much XP was awarded.
 */
export async function completeQuest(
  orgId: string,
  userId: string,
  questId: string,
): Promise<{ actuallyCompleted: boolean; xpAwarded: number }> {
  if (!orgId) throw new Error("completeQuest: orgId is required");
  if (!userId) throw new Error("completeQuest: userId is required");
  if (!questId) throw new Error("completeQuest: questId is required");

  const quest = await getQuest(orgId, questId);
  if (!quest) throw new Error(`completeQuest: quest ${questId} not found`);
  if (!quest.isActive) throw new Error(`completeQuest: quest ${questId} is not active`);

  const isArcadeQuest = quest.type === "arcade";
  const isCheckinQuest = quest.type === "checkin";

  // ✅ Direct completable quests do not require being "started"
  const canCompleteDirectly = isArcadeQuest || isCheckinQuest;

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  let actuallyCompleted = false;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(playerRef);
    if (!snap.exists) {
      throw new Error(`completeQuest: player ${userId} does not exist in org ${orgId}`);
    }

    const data = snap.data() as any;
    const activeQuestIds: string[] = data.activeQuestIds ?? [];
    const completedQuestIds: string[] = data.completedQuestIds ?? [];

    const now = FieldValue.serverTimestamp();

    const isActive = activeQuestIds.includes(questId);
    const alreadyCompleted = completedQuestIds.includes(questId);

    // 🔹 Case A: Normal quest, not active → do nothing
    if (!canCompleteDirectly && !isActive) return;

    let newActive = activeQuestIds;
    let newCompleted = completedQuestIds;

    if (canCompleteDirectly) {
      // 🔹 Arcade + Checkin:
      // - do not require "started"
      // - do not touch activeQuestIds
      if (quest.maxCompletionsPerUser === 1) {
        if (!alreadyCompleted) {
          newCompleted = [...completedQuestIds, questId];
          actuallyCompleted = true;
        }
      } else {
        if (!alreadyCompleted) newCompleted = [...completedQuestIds, questId];
        actuallyCompleted = true;
      }
    } else {
      // 🔹 Normal quest:
      // - MUST be active
      newActive = activeQuestIds.filter((id) => id !== questId);

      if (quest.maxCompletionsPerUser === 1) {
        if (!alreadyCompleted) {
          newCompleted = [...completedQuestIds, questId];
          actuallyCompleted = true;
        }
      } else {
        if (!alreadyCompleted) newCompleted = [...completedQuestIds, questId];
        actuallyCompleted = true;
      }
    }

    tx.update(playerRef, {
      activeQuestIds: newActive,
      completedQuestIds: newCompleted,
      updatedAt: now,
      ...(isCheckinQuest ? { lastCheckinAt: now } : {}),
    });
  });

  const xpAwarded = actuallyCompleted && quest.xp && quest.xp > 0 ? quest.xp : 0;

  // ✅ Only award XP once we know we truly completed
  if (xpAwarded > 0) {
    await writeAuditLog(orgId, userId, {
      eventType: "quest_complete",
      questId,
      source: quest.type,
    });

    await updateXP(orgId, userId, xpAwarded, {
      source: "quest_complete",
      questId,
    });
  }

  return { actuallyCompleted, xpAwarded };
}