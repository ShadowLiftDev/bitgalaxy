import { adminDb } from "@/lib/firebase-admin";

export type QuestType =
  | "checkin"
  | "purchase"
  | "photo"
  | "referral"
  | "visit"
  | "custom"
  | "arcade";

export interface BitGalaxyQuest {
  id: string;
  orgId: string;
  programId: string | null;
  title: string;
  description: string;
  type: QuestType;
  xp: number;
  isActive: boolean;
  maxCompletionsPerUser: number | null;
  checkinCode: string | null;
  requiresStaffApproval: boolean;
  metadata: Record<string, any>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface GetQuestsOptions {
  programId?: string;
  activeOnly?: boolean;
}

export async function getQuests(
  orgId: string,
  options: GetQuestsOptions = {},
): Promise<BitGalaxyQuest[]> {
  if (!orgId) throw new Error("getQuests: orgId is required");

  let query: FirebaseFirestore.Query = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyQuests");

  if (options.programId) {
    query = query.where("programId", "==", options.programId);
  }

  if (options.activeOnly !== false) {
    // default: only active quests
    query = query.where("isActive", "==", true);
  }

  const snap = await query.get();

  const quests: BitGalaxyQuest[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as Omit<BitGalaxyQuest, "id">;
    quests.push({
      id: doc.id,
      ...data,
    });
  });

  // Optional: sort by createdAt or title if needed
  quests.sort((a, b) => {
    const aTs = a.createdAt?.toMillis?.() ?? 0;
    const bTs = b.createdAt?.toMillis?.() ?? 0;
    return aTs - bTs;
  });

  return quests;
}