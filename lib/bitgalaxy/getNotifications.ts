import { adminDb } from "@/lib/firebase-admin";

export type NotificationType =
  | "quest"
  | "reward"
  | "system"
  | "reminder"
  | string;

export interface BitGalaxyNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: FirebaseFirestore.Timestamp | null;
  meta?: Record<string, any>;
}

export async function getNotifications(
  orgId: string,
  userId: string,
  limit: number = 50,
): Promise<BitGalaxyNotification[]> {
  if (!orgId) throw new Error("getNotifications: orgId is required");
  if (!userId) throw new Error("getNotifications: userId is required");

  const snap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId)
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const list: BitGalaxyNotification[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as any;
    list.push({
      id: doc.id,
      type: data.type ?? "system",
      title: data.title ?? "",
      body: data.body ?? "",
      read: !!data.read,
      createdAt: data.createdAt ?? null,
      meta: data.meta ?? undefined,
    });
  });

  return list;
}