import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { ensureArcadeQuestExists } from "@/lib/bitgalaxy/ensureArcadeQuestExists";
// ✅ no requireUser import here
import { updateXP } from "@/lib/bitgalaxy/updateXP";
import { writeAuditLog } from "@/lib/bitgalaxy/auditLog";
import { getISOWeekKey } from "@/lib/weekKey";

export const runtime = "nodejs";

type LevelDef = { label?: string; xp: number; description?: string };

type NebulaBreakStats = {
  score?: number;
  bricks?: number;
  timeMs?: number;
};

function xpForLevel(
  level: number,
  levels?: LevelDef[] | null,
  fallbackBase = 75,
) {
  const lvl = Math.max(1, Math.min(3, Math.floor(level || 1)));

  if (Array.isArray(levels) && levels.length >= lvl) {
    const v = Number(levels[lvl - 1]?.xp || 0);
    return Math.max(0, Math.floor(v));
  }

  // fallback if quest doc not configured
  if (lvl === 1) return fallbackBase;
  if (lvl === 2) return fallbackBase * 2;
  return fallbackBase * 3;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orgId = body.orgId as string | undefined;
    const targetUserId = body.userId as string | undefined;
    const rawLevel = Number(body.level || 1);
    const stats = body.stats as NebulaBreakStats | undefined;

    if (!orgId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing orgId or userId" },
        { status: 400 },
      );
    }

    const questId = "nebula-break";

    await ensureArcadeQuestExists(orgId, questId, {
      title: "Nebula Break – Arcade Mission",
      description:
        "Smash through neon brickfields and push your score into the stratosphere.",
      xp: 75,
    });

    const questSnap = await adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyQuests")
      .doc(questId)
      .get();

    const questData = (questSnap.data() || {}) as any;
    const configuredLevels: LevelDef[] | null =
      (questData.levels as LevelDef[] | undefined) ??
      (questData.meta?.levels as LevelDef[] | undefined) ??
      null;

    const baseXP = Number(questData.xp || 75);
    const weekKey = getISOWeekKey(new Date());

    const playerRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPlayers")
      .doc(targetUserId);

    const now = FieldValue.serverTimestamp() as Timestamp;

    let xpAwarded = 0;
    let newBestLevel = 0;

    // Clamp level between 1 and 3 (we can later add deterministic tiering from stats)
    const requestedLevel = Math.max(
      1,
      Math.min(3, Math.floor(rawLevel || 1)),
    );

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) {
        // Distinct code so we can return 404
        throw new Error(
          `PLAYER_NOT_FOUND::Player ${targetUserId} does not exist in org ${orgId}`,
        );
      }

      const data = (snap.data() || {}) as any;
      const completedQuestIds: string[] = data.completedQuestIds ?? [];

      const specialEvents = (data.specialEvents || {}) as any;
      const nb = (specialEvents.nebulaBreak || {}) as {
        weekKey?: string;
        bestLevel?: number;
        bestScore?: number | null;
        bestBricks?: number | null;
        bestTimeMs?: number | null;
      };

      const prevWeekKey = String(nb.weekKey || "");
      const prevBestLevel =
        prevWeekKey === weekKey ? Number(nb.bestLevel || 0) : 0;

      if (requestedLevel <= prevBestLevel) {
        throw new Error("NEBULA_BREAK_TIER_ALREADY_RECORDED");
      }

      const prevXP = xpForLevel(prevBestLevel, configuredLevels, baseXP);
      const nextXP = xpForLevel(requestedLevel, configuredLevels, baseXP);

      xpAwarded = Math.max(0, nextXP - prevXP);
      if (xpAwarded <= 0) {
        throw new Error("NEBULA_BREAK_NO_XP_DELTA");
      }

      const score =
        typeof stats?.score === "number" ? stats.score : null;
      const bricks =
        typeof stats?.bricks === "number" ? stats.bricks : null;
      const timeMs =
        typeof stats?.timeMs === "number" ? stats.timeMs : null;

      const bestScore = nb.bestScore ?? null;
      const bestBricks = nb.bestBricks ?? null;
      const bestTimeMs = nb.bestTimeMs ?? null;

      // For Nebula: higher score/bricks and longer survival time are better
      const nextBestScore =
        score !== null
          ? bestScore === null
            ? score
            : Math.max(bestScore, score)
          : bestScore;

      const nextBestBricks =
        bricks !== null
          ? bestBricks === null
            ? bricks
            : Math.max(bestBricks, bricks)
          : bestBricks;

      const nextBestTimeMs =
        timeMs !== null
          ? bestTimeMs === null
            ? timeMs
            : Math.max(bestTimeMs, timeMs)
          : bestTimeMs;

      newBestLevel = requestedLevel;

      const nextCompleted = completedQuestIds.includes(questId)
        ? completedQuestIds
        : [...completedQuestIds, questId];

      tx.set(
        playerRef,
        {
          completedQuestIds: nextCompleted,
          specialEvents: {
            ...specialEvents,
            nebulaBreak: {
              weekKey,
              bestLevel: requestedLevel,
              bestScore: nextBestScore,
              bestBricks: nextBestBricks,
              bestTimeMs: nextBestTimeMs,
              lastResult: {
                level: requestedLevel,
                score,
                bricks,
                timeMs,
              },
            },
          },
          updatedAt: now,
        },
        { merge: true },
      );
    });

    await updateXP(orgId, targetUserId, xpAwarded, {
      source: "nebula_break_tier",
      questId,
      meta: { weekKey, tier: newBestLevel },
    });

    await writeAuditLog(orgId, targetUserId, {
      eventType: "arcade_tier_complete",
      questId,
      xpChange: xpAwarded,
      source: "nebula_break",
      meta: { weekKey, tier: newBestLevel, stats: stats ?? null },
    });

    const [activeQuests, player] = await Promise.all([
      getActiveQuests(orgId, targetUserId),
      getPlayer(orgId, targetUserId),
    ]);

    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,
      weekKey,
      tier: newBestLevel,
      xpAwarded,
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
    console.error("BitGalaxy complete-nebula-break error:", error);

    const msg = String(error?.message || "");

    if (msg === "NEBULA_BREAK_TIER_ALREADY_RECORDED") {
      return NextResponse.json(
        {
          error:
            "Tier already recorded this week. Improve your score or bricks to earn more XP.",
        },
        { status: 409 },
      );
    }

    if (msg === "NEBULA_BREAK_NO_XP_DELTA") {
      return NextResponse.json(
        {
          error:
            "No XP change for this tier. You’ve already logged an equal or better performance.",
        },
        { status: 409 },
      );
    }

    if (msg.startsWith("PLAYER_NOT_FOUND::")) {
      return NextResponse.json(
        {
          error:
            "Player profile not found in this world. Refresh the BitGalaxy dashboard and re-link your ID.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to complete Nebula Break quest",
      },
      { status: 500 },
    );
  }
}