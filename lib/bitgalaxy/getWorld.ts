import { adminDb } from "@/lib/firebase-admin";

export interface BitGalaxyWorldDetail {
  orgId: string;
  name: string;
  createdAt?: FirebaseFirestore.Timestamp;
  appsEnabled?: Record<string, any>;
  // Very light stats for now
  totalPlayers?: number;
  totalQuests?: number;
}

export async function getWorld(
  orgId: string,
): Promise<BitGalaxyWorldDetail | null> {
  if (!orgId) throw new Error("getWorld: orgId is required");

  const orgRef = adminDb.collection("orgs").doc(orgId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) return null;

  const orgData = orgSnap.data() as any;

  const [playersSnap, questsSnap] = await Promise.all([
    orgRef.collection("bitgalaxyPlayers").limit(1_000).get(),
    orgRef.collection("bitgalaxyQuests").limit(1_000).get(),
  ]);

  return {
    orgId,
    name: orgData.name ?? orgId,
    createdAt: orgData.createdAt,
    appsEnabled: orgData.appsEnabled ?? {},
    totalPlayers: playersSnap.size,
    totalQuests: questsSnap.size,
  };
}