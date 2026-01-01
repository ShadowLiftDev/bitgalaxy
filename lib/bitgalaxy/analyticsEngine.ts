import { adminDb } from "@/lib/firebase-admin";

export interface OrgAnalyticsSnapshot {
  orgId: string;
  totalPlayers: number;
  totalXP: number;
  totalQuests: number;
  // later: weekly XP, DAU/MAU, etc.
}

export async function getOrgAnalytics(
  orgId: string,
): Promise<OrgAnalyticsSnapshot> {
  if (!orgId) throw new Error("getOrgAnalytics: orgId is required");

  const orgRef = adminDb.collection("orgs").doc(orgId);

  const [playersSnap, questsSnap] = await Promise.all([
    orgRef.collection("bitgalaxyPlayers").get(),
    orgRef.collection("bitgalaxyQuests").get(),
  ]);

  let totalXP = 0;
  playersSnap.forEach((doc) => {
    const data = doc.data() as any;
    totalXP += Number(data.totalXP || 0);
  });

  return {
    orgId,
    totalPlayers: playersSnap.size,
    totalXP,
    totalQuests: questsSnap.size,
  };
}