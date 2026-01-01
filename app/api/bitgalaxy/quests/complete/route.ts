import { NextRequest, NextResponse } from "next/server";
import { completeQuest } from "@/lib/bitgalaxy/completeQuest";
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

    const user = await requireUser(req);
    const userId = user.uid;

    await completeQuest(orgId, userId, questId);

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

        // ✅ new
        level: (player as any).level ?? 1,
        weeklyXP: (player as any).weeklyXP ?? 0,
        weeklyWeekKey: (player as any).weeklyWeekKey ?? "",

        progress,
      },
    });
  } catch (error: any) {
    console.error("BitGalaxy complete quest error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to complete quest" },
      { status: 500 },
    );
  }
}