import { adminDb } from "@/lib/firebase-admin";
import type { BitGalaxyQuest } from "./getQuests";
import { FieldPath } from "firebase-admin/firestore";

export async function getActiveQuests(
  orgId: string,
  userId: string,
): Promise<BitGalaxyQuest[]> {
  if (!orgId) throw new Error("getActiveQuests: orgId is required");
  if (!userId) throw new Error("getActiveQuests: userId is required");

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  const playerSnap = await playerRef.get();
  if (!playerSnap.exists) {
    return [];
  }

  const playerData = playerSnap.data() as any;
  const activeIds: string[] = playerData.activeQuestIds ?? [];

  if (!activeIds.length) return [];

  const questsCol = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyQuests");

  const chunks: string[][] = [];
  for (let i = 0; i < activeIds.length; i += 10) {
    chunks.push(activeIds.slice(i, i + 10));
  }

  const results: BitGalaxyQuest[] = [];

  for (const chunk of chunks) {
    const snap = await questsCol
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    snap.forEach((doc) => {
      const data = doc.data() as Omit<BitGalaxyQuest, "id">;
      results.push({ id: doc.id, ...data });
    });
  }

  return results;
}