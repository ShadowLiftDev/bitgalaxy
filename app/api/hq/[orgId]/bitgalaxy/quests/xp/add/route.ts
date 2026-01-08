import { NextRequest, NextResponse } from "next/server";
import { updateXP } from "@/lib/bitgalaxy/updateXP";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requireUser, requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.orgId as string | undefined;
    const deltaXP = body.deltaXP as number | undefined;
    const targetUserId = (body.userId as string | undefined) ?? null;

    if (!orgId || typeof deltaXP !== "number" || !Number.isFinite(deltaXP)) {
      return NextResponse.json(
        { error: "Missing orgId or invalid deltaXP" },
        { status: 400 },
      );
    }

    const acting = await requireUser(req);
    await requireRole(orgId, acting.uid, ["owner", "admin", "staff"], req);

    const userId = targetUserId ?? acting.uid;

    await updateXP(orgId, userId, deltaXP, {
      source: body.source ?? "manual",
      questId: body.questId ?? null,
      rewardId: body.rewardId ?? null,
      meta: body.meta ?? undefined,
    });

    const player = await getPlayer(orgId, userId);
    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,
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
    console.error("BitGalaxy add XP error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to adjust XP" },
      { status: 500 },
    );
  }
}