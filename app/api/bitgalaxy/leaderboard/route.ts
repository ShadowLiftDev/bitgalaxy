import { NextRequest, NextResponse } from "next/server";
import { getOrgLeaderboard } from "@/lib/bitgalaxy/leaderboard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const limitParam = searchParams.get("limit");
    const scopeParam = searchParams.get("scope"); // "allTime" | "weekly"

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const parsed = limitParam ? Number(limitParam) : 50;
    const limit =
      !Number.isFinite(parsed) || parsed <= 0 ? 50 : Math.min(parsed, 100);

    const scope =
      scopeParam === "weekly" || scopeParam === "allTime"
        ? scopeParam
        : "allTime";

    const leaderboard = await getOrgLeaderboard(orgId, limit, scope);

    return NextResponse.json({
      success: true,
      orgId,
      limit,
      scope,
      leaderboard,
    });
  } catch (error: any) {
    console.error("BitGalaxy leaderboard error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}