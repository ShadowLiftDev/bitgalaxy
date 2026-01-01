import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";

export interface LeaderboardEntry {
  userId: string;
  orgId: string;
  rank: string;
  totalXP: number;
  level?: number;
  weeklyXP?: number;
  weeklyWeekKey?: string;
}

export type LeaderboardScope = "allTime" | "weekly";

export async function getOrgLeaderboard(
  orgId: string,
  limit: number = 50,
  scope: LeaderboardScope = "allTime",
): Promise<LeaderboardEntry[]> {
  if (!orgId) throw new Error("getOrgLeaderboard: orgId is required");

  const weekKey = getISOWeekKey(new Date());
  const field = scope === "weekly" ? "weeklyXP" : "totalXP";

  // Pull extra rows for weekly so we can filter by weekKey without needing an index.
  const queryLimit = scope === "weekly" ? Math.max(limit * 4, 200) : limit;

  const snap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .orderBy(field, "desc")
    .limit(queryLimit)
    .get();

  const entries: LeaderboardEntry[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as any;
    entries.push({
      userId: data.userId ?? doc.id,
      orgId,
      rank: data.rank ?? "Underdog",
      totalXP: Number(data.totalXP || 0),
      level: Number(data.level || 1),
      weeklyXP: Number(data.weeklyXP || 0),
      weeklyWeekKey: String(data.weeklyWeekKey || ""),
    });
  });

  if (scope === "weekly") {
    return entries
      .filter((e) => e.weeklyWeekKey === weekKey)
      .slice(0, limit);
  }

  return entries.slice(0, limit);
}