import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ArcadeQuestDefaults = {
  title: string;
  description: string;
  xp: number;
};

export async function ensureArcadeQuestExists(
  orgId: string,
  questId: string,
  defaults: ArcadeQuestDefaults,
) {
  const questRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyQuests")
    .doc(questId);

  const snap = await questRef.get();
  if (snap.exists) return;

  const now = FieldValue.serverTimestamp() as Timestamp;

  await questRef.set({
    id: questId,
    title: defaults.title,
    description: defaults.description,
    xp: defaults.xp,
    isActive: true,
    type: "arcade",        // 👈 this is what your engine reads
    category: "mini-game",
    isRepeatable: false,
    maxCompletionsPerUser: 1,
    programId: null,
    createdAt: now,
    updatedAt: now,
  });
}