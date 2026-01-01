import { NextRequest, NextResponse } from "next/server";
import { handleCheckin } from "@/lib/bitgalaxy/checkin";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.orgId as string | undefined;
    const code = body.code as string | null | undefined;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const user = await requireUser(req);
    const userId = user.uid;

    const result = await handleCheckin(orgId, userId, code ?? null);

    const player = await getPlayer(orgId, userId);
    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,
      result,
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
    console.error("BitGalaxy checkin error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to process check-in" },
      { status: 500 },
    );
  }
}