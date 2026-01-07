import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { ensureArcadeQuestExists } from "@/lib/bitgalaxy/ensureArcadeQuestExists";
// ❌ no requireUser here – not Firebase-locked
import { updateXP } from "@/lib/bitgalaxy/updateXP";
import { writeAuditLog } from "@/lib/bitgalaxy/auditLog";
import { getISOWeekKey } from "@/lib/weekKey";

export const runtime = "nodejs";

type LevelDef = { label?: string; xp: number; description?: string };

type GalaxyPaddleStats = {
  hits?: number;
  timeMs?: number;
  maxSpeed?: number;
};

function xpForLevel(
  level: number,
  levels?: LevelDef[] | null,
  fallbackBase = 50,
) {
  const lvl = Math.max(1, Math.min(3, Math.floor(level || 1)));

  if (Array.isArray(levels) && levels.length >= lvl) {
    const v = Number(levels[lvl - 1]?.xp || 0);
    return Math.max(0, Math.floor(v));
  }

  if (lvl === 1) return fallbackBase;
  if (lvl === 2) return fallbackBase * 2;
  return fallbackBase * 3;
}

/**
 * Server-side tier computation based on stats.
 * Mirrors the client thresholds:
 *  - Tier 1: sec >= 10 OR hits >= 5
 *  - Tier 2: sec >= 25 OR hits >= 15
 *  - Tier 3: sec >= 45 OR hits >= 30
 */
function computeGalaxyPaddleTierFromStats(
  stats?: GalaxyPaddleStats,
): 1 | 2 | 3 {
  if (!stats) return 1;

  const hits = typeof stats.hits === "number" ? stats.hits : 0;
  const timeMs = typeof stats.timeMs === "number" ? stats.timeMs : 0;
  const sec = timeMs / 1000;

  const t1 = sec >= 10 || hits >= 5;
  const t2 = sec >= 25 || hits >= 15;
  const t3 = sec >= 45 || hits >= 30;

  if (t3) return 3;
  if (t2) return 2;
  if (t1) return 1;
  return 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orgId = body.orgId as string | undefined;
    const targetUserId = body.userId as string | undefined;
    const rawLevel = Number(body.level || 1);
    const stats = body.stats as GalaxyPaddleStats | undefined;

    if (!orgId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing orgId or userId" },
        { status: 400 },
      );
    }

    const questId = "galaxy-paddle";

    // Ensure the arcade quest doc exists with a base XP value
    await ensureArcadeQuestExists(orgId, questId, {
      title: "Galaxy Paddle – Arcade Mission",
      description:
        "Hold the defensive line and keep the core in play to log your first completion.",
      xp: 50,
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

    const baseXP = Number(questData.xp || 50);
    const weekKey = getISOWeekKey(new Date());

    const playerRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPlayers")
      .doc(targetUserId);

    const now = FieldValue.serverTimestamp() as Timestamp;

    let xpAwarded = 0;
    let newBestLevel = 0;

    // Clamp the requested level between 1 and 3
    const requestedLevel = Math.max(
      1,
      Math.min(3, Math.floor(rawLevel || 1)),
    );

    // If we have stats, compute the max tier they justify
    // and clamp the effective level to that.
    let effectiveLevel = requestedLevel;
    const hasStats =
      stats &&
      (typeof stats.hits === "number" || typeof stats.timeMs === "number");
    if (hasStats) {
      const maxTierFromStats = computeGalaxyPaddleTierFromStats(stats);
      effectiveLevel = Math.min(requestedLevel, maxTierFromStats);
    }

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) {
        // This will be mapped to a 404 below.
        throw new Error(
          `PLAYER_NOT_FOUND::Player ${targetUserId} does not exist in org ${orgId}`,
        );
      }

      const data = (snap.data() || {}) as any;
      const completedQuestIds: string[] = data.completedQuestIds ?? [];

      const specialEvents = (data.specialEvents || {}) as any;
      const gp = (specialEvents.galaxyPaddle || {}) as {
        weekKey?: string;
        bestLevel?: number;
        bestHits?: number | null;
        bestTimeMs?: number | null;
        bestMaxSpeed?: number | null;
      };

      const prevWeekKey = String(gp.weekKey || "");
      const prevBestLevel =
        prevWeekKey === weekKey ? Number(gp.bestLevel || 0) : 0;

      // Effective level after server-side clamping
      const finalLevel = Math.max(
        1,
        Math.min(3, Math.floor(effectiveLevel || 1)),
      );

      // Prevent re-logging equal or worse tiers in this week
      if (finalLevel <= prevBestLevel) {
        throw new Error("GALAXY_PADDLE_TIER_ALREADY_RECORDED");
      }

      const prevXP = xpForLevel(prevBestLevel, configuredLevels, baseXP);
      const nextXP = xpForLevel(finalLevel, configuredLevels, baseXP);

      xpAwarded = Math.max(0, nextXP - prevXP);
      if (xpAwarded <= 0) {
        throw new Error("GALAXY_PADDLE_NO_XP_DELTA");
      }

      const hits =
        typeof stats?.hits === "number" ? stats.hits : null;
      const timeMs =
        typeof stats?.timeMs === "number" ? stats.timeMs : null;
      const maxSpeed =
        typeof stats?.maxSpeed === "number" ? stats.maxSpeed : null;

      const bestHits = gp.bestHits ?? null;
      const bestTimeMs = gp.bestTimeMs ?? null;
      const bestMaxSpeed = gp.bestMaxSpeed ?? null;

      const nextBestHits =
        hits !== null
          ? bestHits === null
            ? hits
            : Math.max(bestHits, hits)
          : bestHits;

      const nextBestTimeMs =
        timeMs !== null
          ? bestTimeMs === null
            ? timeMs
            : Math.max(bestTimeMs, timeMs)
          : bestTimeMs;

      const nextBestMaxSpeed =
        maxSpeed !== null
          ? bestMaxSpeed === null
            ? maxSpeed
            : Math.max(bestMaxSpeed, maxSpeed)
          : bestMaxSpeed;

      newBestLevel = finalLevel;

      const nextCompleted = completedQuestIds.includes(questId)
        ? completedQuestIds
        : [...completedQuestIds, questId];

      tx.set(
        playerRef,
        {
          completedQuestIds: nextCompleted,
          specialEvents: {
            ...specialEvents,
            galaxyPaddle: {
              weekKey,
              bestLevel: finalLevel,
              bestHits: nextBestHits,
              bestTimeMs: nextBestTimeMs,
              bestMaxSpeed: nextBestMaxSpeed,
              lastResult: { level: finalLevel, hits, timeMs, maxSpeed },
            },
          },
          updatedAt: now,
        },
        { merge: true },
      );
    });

    // Apply XP and write audit log only after successful transaction
    await updateXP(orgId, targetUserId, xpAwarded, {
      source: "galaxy_paddle_tier",
      questId,
      meta: { weekKey, tier: newBestLevel },
    });

    await writeAuditLog(orgId, targetUserId, {
      eventType: "arcade_tier_complete",
      questId,
      xpChange: xpAwarded,
      source: "galaxy_paddle",
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
    console.error("BitGalaxy complete-galaxy-paddle error:", error);

    const msg = String(error?.message || "");

    if (msg === "GALAXY_PADDLE_TIER_ALREADY_RECORDED") {
      return NextResponse.json(
        {
          error:
            "Tier already recorded this week. Improve your run to earn more XP.",
        },
        { status: 409 },
      );
    }

    if (msg === "GALAXY_PADDLE_NO_XP_DELTA") {
      return NextResponse.json(
        {
          error:
            "No extra XP for this run. You’ve already logged an equal or higher tier this week.",
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
      { error: error?.message ?? "Failed to complete Galaxy Paddle quest" },
      { status: 500 },
    );
  }
}