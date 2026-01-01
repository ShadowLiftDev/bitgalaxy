import { adminDb } from "@/lib/firebase-admin";
import { getQuest } from "./getQuest";
import { completeQuest } from "./completeQuest";
import { updateXP } from "./updateXP";
import { writeAuditLog } from "./auditLog";

export interface CheckinResult {
  questId?: string | null;
  xpAwarded: number;
  source: string; // "quest_checkin" | "config_checkin" | "none"
}

/**
 * Handles a BitGalaxy check-in by code.
 * 1) Tries to find an active checkin quest with matching checkinCode.
 * 2) If found, completes that quest for the player (awards quest XP via updateXP).
 * 3) If not, falls back to xpPerCheckin from org bitgalaxyConfig.
 */
export async function handleCheckin(
  orgId: string,
  userId: string,
  code: string | null,
): Promise<CheckinResult> {
  if (!orgId) throw new Error("handleCheckin: orgId is required");
  if (!userId) throw new Error("handleCheckin: userId is required");

  const trimmedCode = code?.trim();

  // 1) Try quest-based checkin
  if (trimmedCode) {
    const questsSnap = await adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyQuests")
      .where("type", "==", "checkin")
      .where("checkinCode", "==", trimmedCode)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!questsSnap.empty) {
      const questDoc = questsSnap.docs[0];
      const questId = questDoc.id;
      const quest = await getQuest(orgId, questId);

      if (quest) {
        const result = await completeQuest(orgId, userId, questId);
        const xpAwarded = result.xpAwarded;

        await writeAuditLog(orgId, userId, {
          eventType: "checkin",
          questId,
          xpChange: xpAwarded,
          source: "quest_checkin",
        });

        return { questId, xpAwarded, source: "quest_checkin" };
      }
    }
  }

  // 2) Fallback: xpPerCheckin from config
  const configSnap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyConfig")
    .doc("config")
    .get();

  if (configSnap.exists) {
    const cfg = configSnap.data() as any;
    const fallbackXP = Number(cfg.xpPerCheckin || 0);

    if (fallbackXP > 0) {
      await updateXP(orgId, userId, fallbackXP, { source: "config_checkin" });

      await writeAuditLog(orgId, userId, {
        eventType: "checkin",
        xpChange: fallbackXP,
        source: "config_checkin",
      });

      return { questId: null, xpAwarded: fallbackXP, source: "config_checkin" };
    }
  }

  // 3) No quest and no fallback XP
  await writeAuditLog(orgId, userId, {
    eventType: "checkin",
    xpChange: 0,
    source: "none",
  });

  return { questId: null, xpAwarded: 0, source: "none" };
}