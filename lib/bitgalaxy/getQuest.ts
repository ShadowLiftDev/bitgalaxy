import { adminDb } from "@/lib/firebase-admin";
import type { BitGalaxyQuest } from "./getQuests";

export async function getQuest(
  orgId: string,
  questId: string,
): Promise<BitGalaxyQuest | null> {
  if (!orgId) throw new Error("getQuest: orgId is required");
  if (!questId) throw new Error("getQuest: questId is required");

  const ref = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyQuests")
    .doc(questId);

  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Omit<BitGalaxyQuest, "id">;

  return { id: snap.id, ...data };
}