import { NextRequest, NextResponse } from "next/server";
import { startQuest } from "@/lib/bitgalaxy/startQuest";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";

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

    const session = requirePlayerSession(req);

    if (session.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: session does not match org" },
        { status: 401 },
      );
    }

    // Optional: if client sends userId, enforce it matches session
    const maybeUserId = body.userId as string | undefined;
    if (maybeUserId && maybeUserId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized: session does not match player" },
        { status: 401 },
      );
    }

    const userId = session.userId;

    const quest = await getQuest(orgId, questId);
    if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

    if (quest.type === "arcade") {
      return NextResponse.json(
        { error: "Arcade quests cannot be started. Play the game to complete tiers." },
        { status: 400 },
      );
    }

    await startQuest(orgId, userId, questId);
    
    if (quest.type === "checkin") {
      return NextResponse.json(
        { error: "Check-in quests cannot be started. Use the check-in code flow." },
        { status: 400 },
      );
    }

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
        level: (player as any).level ?? 1,
        weeklyXP: (player as any).weeklyXP ?? 0,
        weeklyWeekKey: (player as any).weeklyWeekKey ?? "",
        progress,
      },
    });
  } catch (error: any) {
    const status = (error as any)?.status;
    if (status === 401) {
      return NextResponse.json(
        { error: "Unauthorized: link your BitGalaxy profile to start quests." },
        { status: 401 },
      );
    }

    console.error("BitGalaxy start quest error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to start quest" },
      { status: 500 },
    );
  }
}