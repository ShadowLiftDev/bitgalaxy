import { NextRequest, NextResponse } from "next/server";
import { completeQuest } from "@/lib/bitgalaxy/completeQuest";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";
import { getQuest } from "@/lib/bitgalaxy/getQuest";

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

    // Optional: if caller included userId, enforce it
    const maybeUserId = body.userId as string | undefined;
    if (maybeUserId && maybeUserId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized: session does not match player" },
        { status: 401 },
      );
    }

    const userId = session.userId;

    // ✅ Protocol gate: prevent bypassing arcade/checkin flows
    const quest = await getQuest(orgId, questId);
    if (!quest) {
      return NextResponse.json({ error: "Quest not found" }, { status: 404 });
    }

    if (quest.type === "arcade") {
      return NextResponse.json(
        { error: "Arcade quests must be completed via their complete-* endpoint." },
        { status: 400 },
      );
    }

    if (quest.type === "checkin") {
      return NextResponse.json(
        { error: "Check-in quests must be completed via /api/bitgalaxy/checkin with a code." },
        { status: 400 },
      );
    }

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
        level: (player as any).level ?? 1,
        weeklyXP: (player as any).weeklyXP ?? 0,
        weeklyWeekKey: (player as any).weeklyWeekKey ?? "",
        progress,
      },
    });
  } catch (error: any) {
    const msg = String(error?.message || "");
    const status = (error as any)?.status;

    if (status === 401) {
      return NextResponse.json(
        { error: "Unauthorized: link your BitGalaxy profile to complete quests." },
        { status: 401 },
      );
    }

    console.error("BitGalaxy complete quest error:", error);
    return NextResponse.json(
      { error: msg || "Failed to complete quest" },
      { status: 500 },
    );
  }
}