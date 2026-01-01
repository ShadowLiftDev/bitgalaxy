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

  return data.inventory ?? [];
}