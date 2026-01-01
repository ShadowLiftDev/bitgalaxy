import { adminDb } from "@/lib/firebase-admin";
import type { BitGalaxyPlayer, PlayerInventoryItem } from "./getPlayer";

export async function getInventory(
  orgId: string,
  userId: string,
): Promise<PlayerInventoryItem[]> {
  if (!orgId) throw new Error("getInventory: orgId is required");
  if (!userId) throw new Error("getInventory: userId is required");

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId);

  const snap = await playerRef.get();
  if (!snap.exists) return [];

  const data = snap.data() as BitGalaxyPlayer;

  const inv = (data.inventory ?? []).map((it: any) => ({
    itemId: it.itemId,
    quantity: it.quantity ?? 1,
    label: it.label,
    description: it.description,
    source: it.source,
    createdAt:
      typeof it.createdAt?.toMillis === "function" ? it.createdAt.toMillis() : it.createdAt,
  }));

  return inv;
}