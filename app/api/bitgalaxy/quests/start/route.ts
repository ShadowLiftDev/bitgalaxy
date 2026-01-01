import { NextRequest, NextResponse } from "next/server";
import { startQuest } from "@/lib/bitgalaxy/startQuest";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.orgId as string | undefined;
    const questId = body.questId as string | undefined;

    if (!orgId || !questId) {
      return NextResponse.json(
        { error: "Missing orgId or questId" },
        { status: 400 },
      );
    }

    // 🔐 Auth
    const user = await requireUser(req);
    const userId = user.uid;

    await startQuest(orgId, userId, questId);

    // 🎮 UI optimization: return refreshed active quests & player snapshot
    const [activeQuests, player] = await Promise.all([
      getActiveQuests(orgId, userId),
      getPlayer(orgId, userId),
    ]);
    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,
      activeQuests,
      player: {
        userId: player.userId,
        orgId: player.orgId,
        totalXP: player.totalXP,
        rank: player.rank,
        progress,
      },
    });
  } catch (error: any) {
    console.error("BitGalaxy start quest error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to start quest" },
      { status: 500 },
    );
  }
}