import { adminDb } from "@/lib/firebase-admin";

export type HistoryEventType =
  | "xp"
  | "quest_complete"
  | "checkin"
  | "reward_redeem"
  | "referral"
  | string;

export interface BitGalaxyHistoryEntry {
  id: string;
  eventType: HistoryEventType;
  xpChange: number;
  questId: string | null;
  rewardId: string | null;
  source: string;
  timestamp: FirebaseFirestore.Timestamp | null;
  meta?: Record<string, any>;
}

export async function getHistory(
  orgId: string,
  userId: string,
  limit: number = 50,
): Promise<BitGalaxyHistoryEntry[]> {
  if (!orgId) throw new Error("getHistory: orgId is required");
  if (!userId) throw new Error("getHistory: userId is required");

  const snap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId)
    .collection("history")
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  const entries: BitGalaxyHistoryEntry[] = [];

  snap.forEach((doc) => {
    const data = doc.data() as any;
    entries.push({
      id: doc.id,
      eventType: data.eventType ?? "xp",
      xpChange: Number(data.xpChange ?? 0),
      questId: data.questId ?? null,
      rewardId: data.rewardId ?? null,
      source: data.source ?? "",
      timestamp: data.timestamp ?? null,
      meta: data.meta ?? undefined,
    });
  });

  return entries;
}