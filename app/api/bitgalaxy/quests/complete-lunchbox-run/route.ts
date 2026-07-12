import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getWorld } from "@/lib/bitgalaxy/getWorld";
import {
  getLevelForXP,
  getRankForXP,
  getRankProgress,
} from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";
import { getISOWeekKey } from "@/lib/weekKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_ID = "lunchbox-run";
const MODULE_ID = "bitgalaxy";

const FALLBACK_SCORE_THRESHOLDS = [250, 900, 1800] as const;

const MAX_RUN_TIME_MS = 3_600_000;
const MAX_SCORE_RATE_PER_SECOND = 85;
const MIN_SCORE_RATE_PER_SECOND = 10;

type ScoreTier = 0 | 1 | 2 | 3;
type RewardTier = 1 | 2 | 3;

type LunchboxRunRequestBody = {
  orgId?: unknown;
  memberId?: unknown;
  score?: unknown;

  stats?: {
    timeMs?: unknown;
    jumps?: unknown;
    speedups?: unknown;
  };
};

type LevelDefinition = {
  level: RewardTier;
  xp: number;
};

type StoredLunchboxRunGame = {
  completed?: unknown;

  weeklyWeekKey?: unknown;
  weeklyBestLevel?: unknown;
  weeklyBestScore?: unknown;

  bestLevel?: unknown;
  bestScore?: unknown;
  bestTimeMs?: unknown;
  bestJumps?: unknown;
  bestSpeedups?: unknown;

  runs?: unknown;
};

const FALLBACK_LEVELS: LevelDefinition[] = [
  {
    level: 1,
    xp: 50,
  },
  {
    level: 2,
    xp: 100,
  },
  {
    level: 3,
    xp: 150,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | LunchboxRunRequestBody
      | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const orgId = normalizeRequiredString(body.orgId);

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orgId.",
        },
        { status: 400 },
      );
    }

    const session = requirePlayerSession(request);

    if (!session?.memberId) {
      return NextResponse.json(
        {
          success: false,
          error: "A connected BitGalaxy member session is required.",
        },
        { status: 401 },
      );
    }

    if (session.orgId !== orgId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Session organization does not match the requested organization.",
        },
        { status: 403 },
      );
    }

    const requestedMemberId = normalizeOptionalString(body.memberId);

    if (
      requestedMemberId &&
      requestedMemberId !== session.memberId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session member does not match the requested member.",
        },
        { status: 403 },
      );
    }

    const memberId = session.memberId;

    const score = normalizeNonNegativeInteger(body.score);
    const timeMs = normalizePositiveInteger(body.stats?.timeMs);
    const jumps = normalizeNonNegativeInteger(body.stats?.jumps);
    const speedups = normalizeNonNegativeInteger(body.stats?.speedups);

    if (
      score === null ||
      timeMs === null ||
      jumps === null ||
      speedups === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "score, timeMs, jumps, and speedups must contain valid numeric values.",
        },
        { status: 400 },
      );
    }

    if (timeMs > MAX_RUN_TIME_MS) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted Lunchbox Run duration is outside the accepted range.",
        },
        { status: 400 },
      );
    }

    const seconds = timeMs / 1000;

    /*
     * The client starts near 22.5 points per second and can
     * eventually approach 80 points per second.
     *
     * The upper bound includes tolerance for frame timing.
     */
    const maximumPlausibleScore = Math.ceil(
      seconds * MAX_SCORE_RATE_PER_SECOND,
    );

    if (score > maximumPlausibleScore) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted score is too high for the recorded run duration.",
        },
        { status: 400 },
      );
    }

    /*
     * Wall-clock runtime and animation-frame scoring can drift
     * when a browser tab is throttled, so this lower bound is
     * deliberately lenient.
     */
    if (seconds >= 5) {
      const minimumPlausibleScore = Math.floor(
        seconds * MIN_SCORE_RATE_PER_SECOND,
      );

      if (score < minimumPlausibleScore) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Submitted score is too low for the recorded run duration.",
          },
          { status: 400 },
        );
      }
    }

    /*
     * Speedups occur every 6–10 seconds. A five-second bound
     * provides tolerance beyond the intended minimum interval.
     */
    const maximumPlausibleSpeedups = Math.ceil(timeMs / 5000);

    if (speedups > maximumPlausibleSpeedups) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted speedup count is too high for the recorded run duration.",
        },
        { status: 400 },
      );
    }

    /*
     * A complete jump lasts roughly 0.66 seconds. Two jumps per
     * second is already a generous upper bound.
     */
    const maximumPlausibleJumps = Math.ceil(seconds * 2) + 1;

    if (jumps > maximumPlausibleJumps) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted jump count is too high for the recorded run duration.",
        },
        { status: 400 },
      );
    }

    const [world, quest] = await Promise.all([
      getWorld(orgId),
      getQuest(orgId, GAME_ID),
    ]);

    if (
      !world ||
      world.status !== "active" ||
      world.allowPublicAccess !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This BitGalaxy world is not currently available.",
        },
        { status: 403 },
      );
    }

    if (
      !quest ||
      quest.isActive !== true ||
      quest.type !== "arcade"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Lunchbox Run is not currently available.",
        },
        { status: 404 },
      );
    }

    const scoreThresholds = resolveScoreThresholds(quest.metadata);

    const submittedLevel = tierForScore(score, scoreThresholds);

    if (submittedLevel === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Run too short to record. Survive longer to unlock Tier 1.",
        },
        { status: 409 },
      );
    }

    const levelDefinitions = resolveLevelDefinitions(
      quest.metadata,
      quest.xp,
    );

    const memberRef = adminDb
      .collection("members")
      .doc(memberId);

    const orgLinkRef = memberRef
      .collection("orgLinks")
      .doc(orgId);

    const moduleRef = orgLinkRef
      .collection("modules")
      .doc(MODULE_ID);

    const stateRef = moduleRef
      .collection("state")
      .doc("current");

    const gameRef = moduleRef
      .collection("games")
      .doc(GAME_ID);

    const activityRef = adminDb
      .collection("activities")
      .doc();

    const weekKey = getISOWeekKey(new Date());

    const result = await adminDb.runTransaction(
      async (transaction) => {
        const [
          memberSnapshot,
          orgLinkSnapshot,
          stateSnapshot,
          gameSnapshot,
        ] = await Promise.all([
          transaction.get(memberRef),
          transaction.get(orgLinkRef),
          transaction.get(stateRef),
          transaction.get(gameRef),
        ]);

        if (!memberSnapshot.exists) {
          throw new Error(`MEMBER_NOT_FOUND:${memberId}`);
        }

        if (!orgLinkSnapshot.exists) {
          throw new Error(`MEMBER_NOT_CONNECTED:${memberId}`);
        }

        const stateData = stateSnapshot.data() ?? {};

        const gameData = (
          gameSnapshot.data() ?? {}
        ) as StoredLunchboxRunGame;

        const previousWeeklyWeekKey =
          typeof gameData.weeklyWeekKey === "string"
            ? gameData.weeklyWeekKey
            : "";

        const isCurrentWeek = previousWeeklyWeekKey === weekKey;

        const previousWeeklyBestLevel = isCurrentWeek
          ? normalizeStoredNonNegativeInteger(
              gameData.weeklyBestLevel,
            )
          : 0;

        const previousWeeklyBestScore = isCurrentWeek
          ? normalizeStoredNonNegativeInteger(
              gameData.weeklyBestScore,
            )
          : 0;

        const previousWeeklyReward = xpForLevel(
          previousWeeklyBestLevel,
          levelDefinitions,
        );

        const submittedWeeklyReward = xpForLevel(
          submittedLevel,
          levelDefinitions,
        );

        const xpAwarded =
          submittedLevel > previousWeeklyBestLevel
            ? Math.max(
                0,
                submittedWeeklyReward - previousWeeklyReward,
              )
            : 0;

        const nextWeeklyBestLevel = Math.max(
          previousWeeklyBestLevel,
          submittedLevel,
        );

        const nextWeeklyBestScore = Math.max(
          previousWeeklyBestScore,
          score,
        );

        const previousBestLevel =
          normalizeStoredNonNegativeInteger(gameData.bestLevel);

        const previousBestScore =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestScore,
          );

        const previousBestTimeMs =
          normalizeStoredNullablePositiveInteger(
            gameData.bestTimeMs,
          );

        const previousBestJumps =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestJumps,
          );

        const previousBestSpeedups =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestSpeedups,
          );

        const scoreImproved =
          previousBestScore === null ||
          score > previousBestScore;

        let nextBestLevel = previousBestLevel;
        let nextBestScore = previousBestScore;
        let nextBestTimeMs = previousBestTimeMs;
        let nextBestJumps = previousBestJumps;
        let nextBestSpeedups = previousBestSpeedups;

        /*
         * Lunchbox Run uses score as its primary all-time
         * performance measure. When score improves, the full
         * best-run profile is replaced with that run.
         */
        if (scoreImproved) {
          nextBestLevel = submittedLevel;
          nextBestScore = score;
          nextBestTimeMs = timeMs;
          nextBestJumps = jumps;
          nextBestSpeedups = speedups;
        }

        const previousRuns =
          normalizeStoredNonNegativeInteger(gameData.runs);

        const nextRuns = previousRuns + 1;

        const previousTotalXP =
          normalizeStoredNonNegativeInteger(stateData.totalXP);

        const resultingTotalXP = previousTotalXP + xpAwarded;

        const resultingRank = getRankForXP(resultingTotalXP);
        const resultingLevel = getLevelForXP(resultingTotalXP);

        const previousWeeklyXP =
          stateData.weeklyWeekKey === weekKey
            ? normalizeStoredNonNegativeInteger(stateData.weeklyXP)
            : 0;

        const resultingWeeklyXP = previousWeeklyXP + xpAwarded;

        const completedQuestIds = normalizeStringArray(
          stateData.completedQuestIds,
        );

        const questCompletionCounts = normalizeCompletionCounts(
          stateData.questCompletionCounts,
        );

        const nextCompletedQuestIds = completedQuestIds.includes(GAME_ID)
          ? completedQuestIds
          : [...completedQuestIds, GAME_ID];

        const nextCompletionCount =
          (questCompletionCounts[GAME_ID] ?? 0) + 1;

        const now = FieldValue.serverTimestamp();

        transaction.set(
          gameRef,
          {
            gameId: GAME_ID,
            moduleId: MODULE_ID,
            orgId,
            memberId,

            completed: true,

            weeklyWeekKey: weekKey,
            weeklyBestLevel: nextWeeklyBestLevel,
            weeklyBestScore: nextWeeklyBestScore,

            bestLevel: nextBestLevel,
            bestScore: nextBestScore,
            bestTimeMs: nextBestTimeMs,
            bestJumps: nextBestJumps,
            bestSpeedups: nextBestSpeedups,

            runs: nextRuns,

            lastResult: {
              level: submittedLevel,

              score,
              timeMs,
              jumps,
              speedups,

              scoreThresholds,
              xpAwarded,

              completedAt: now,
            },

            updatedAt: now,

            ...(gameSnapshot.exists
              ? {}
              : {
                  createdAt: now,
                }),
          },
          {
            merge: true,
          },
        );

        transaction.set(
          stateRef,
          {
            moduleId: MODULE_ID,
            orgId,
            memberId,

            totalXP: resultingTotalXP,
            rank: resultingRank,
            level: resultingLevel,

            weeklyXP: resultingWeeklyXP,
            weeklyWeekKey: weekKey,

            completedQuestIds: nextCompletedQuestIds,

            questCompletionCounts: {
              ...questCompletionCounts,
              [GAME_ID]: nextCompletionCount,
            },

            updatedAt: now,

            ...(stateSnapshot.exists
              ? {}
              : {
                  activeQuestIds: [],
                  createdAt: now,
                }),
          },
          {
            merge: true,
          },
        );

        transaction.set(activityRef, {
          activityId: activityRef.id,

          system: MODULE_ID,
          moduleId: MODULE_ID,

          orgId,
          memberId,

          eventType:
            xpAwarded > 0
              ? "arcade_tier_complete"
              : "arcade_run",

          xpChange: xpAwarded,

          questId: GAME_ID,
          gameId: GAME_ID,
          rewardId: null,

          source: "lunchbox_run",

          meta: {
            weekKey,

            submittedLevel,

            previousWeeklyBestLevel,
            resultingWeeklyBestLevel: nextWeeklyBestLevel,

            previousWeeklyBestScore,
            resultingWeeklyBestScore: nextWeeklyBestScore,

            scoreImproved,

            score,
            timeMs,
            jumps,
            speedups,

            scoreThresholds,

            previousTotalXP,
            resultingTotalXP,

            resultingRank,
            resultingLevel,

            resultingWeeklyXP,
            weeklyWeekKey: weekKey,

            runs: nextRuns,
          },

          occurredAt: now,
          createdAt: now,
        });

        return {
          weekKey,

          submittedLevel,
          weeklyBestLevel: nextWeeklyBestLevel,
          weeklyBestScore: nextWeeklyBestScore,

          xpAwarded,
          statsImproved: scoreImproved,

          bestLevel: nextBestLevel,
          bestScore: nextBestScore,
          bestTimeMs: nextBestTimeMs,
          bestJumps: nextBestJumps,
          bestSpeedups: nextBestSpeedups,

          runs: nextRuns,
        };
      },
    );

    const [player, activeQuests] = await Promise.all([
      getPlayer(orgId, memberId),
      getActiveQuests(orgId, memberId),
    ]);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Lunchbox Run was recorded, but updated member progress could not be loaded.",
        },
        { status: 500 },
      );
    }

    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,

      orgId,
      memberId,
      gameId: GAME_ID,

      result,
      activeQuests,

      player: {
        memberId: player.memberId,
        orgId: player.orgId,

        displayName: player.displayName ?? null,

        totalXP: player.totalXP,
        rank: player.rank,
        level: player.level,

        weeklyXP: player.weeklyXP,
        weeklyWeekKey: player.weeklyWeekKey,

        progress,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[bitgalaxy:complete-lunchbox-run:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete Lunchbox Run.";

    if (message.startsWith("MEMBER_NOT_FOUND:")) {
      return NextResponse.json(
        {
          success: false,
          error: "Member profile not found.",
        },
        { status: 404 },
      );
    }

    if (message.startsWith("MEMBER_NOT_CONNECTED:")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Member is not connected to this organization.",
        },
        { status: 403 },
      );
    }

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        error:
          status === 500
            ? "Failed to complete Lunchbox Run."
            : message,
      },
      { status },
    );
  }
}

function tierForScore(
  score: number,
  thresholds: readonly number[],
): ScoreTier {
  const tier1Minimum = thresholds[0] ?? 250;
  const tier2Minimum = thresholds[1] ?? 900;
  const tier3Minimum = thresholds[2] ?? 1800;

  if (score < tier1Minimum) {
    return 0;
  }

  if (score >= tier3Minimum) {
    return 3;
  }

  if (score >= tier2Minimum) {
    return 2;
  }

  return 1;
}

function resolveScoreThresholds(
  metadata: unknown,
): [number, number, number] {
  const metadataRecord =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const rawThresholds = Array.isArray(
    metadataRecord.scoreThresholds,
  )
    ? metadataRecord.scoreThresholds
    : null;

  if (!rawThresholds || rawThresholds.length < 3) {
    return [...FALLBACK_SCORE_THRESHOLDS];
  }

  const tier1 = normalizeStoredNonNegativeInteger(rawThresholds[0]);
  const tier2 = normalizeStoredNonNegativeInteger(rawThresholds[1]);
  const tier3 = normalizeStoredNonNegativeInteger(rawThresholds[2]);

  if (
    tier1 <= 0 ||
    tier2 <= tier1 ||
    tier3 <= tier2
  ) {
    return [...FALLBACK_SCORE_THRESHOLDS];
  }

  return [tier1, tier2, tier3];
}

function resolveLevelDefinitions(
  metadata: unknown,
  fallbackXP: number,
): LevelDefinition[] {
  const metadataRecord =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const rawLevels = Array.isArray(metadataRecord.levels)
    ? metadataRecord.levels
    : [];

  const normalizedFallbackXP = Math.max(
    0,
    Math.floor(
      Number.isFinite(Number(fallbackXP))
        ? Number(fallbackXP)
        : 50,
    ),
  );

  return FALLBACK_LEVELS.map((fallbackDefinition) => {
    const configuredDefinition = rawLevels.find((entry) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry)
      ) {
        return false;
      }

      return (
        Number(
          (entry as Record<string, unknown>).level,
        ) === fallbackDefinition.level
      );
    });

    if (
      !configuredDefinition ||
      typeof configuredDefinition !== "object"
    ) {
      return {
        level: fallbackDefinition.level,
        xp:
          fallbackDefinition.level *
          normalizedFallbackXP,
      };
    }

    const configuredData =
      configuredDefinition as Record<string, unknown>;

    const configuredXP =
      normalizeStoredNonNegativeInteger(configuredData.xp);

    return {
      level: fallbackDefinition.level,
      xp:
        configuredXP > 0
          ? configuredXP
          : fallbackDefinition.level *
            normalizedFallbackXP,
    };
  });
}

function xpForLevel(
  level: number,
  levels: LevelDefinition[],
): number {
  if (level <= 0) {
    return 0;
  }

  return (
    levels.find(
      (definition) => definition.level === level,
    )?.xp ?? 0
  );
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizePositiveInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeNonNegativeInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeStoredNonNegativeInteger(
  value: unknown,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return Math.floor(parsed);
}

function normalizeStoredNullableNonNegativeInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeStoredNullablePositiveInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (entry): entry is string =>
            typeof entry === "string",
        )
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeCompletionCounts(
  value: unknown,
): Record<string, number> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const normalized: Record<string, number> = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();

    if (!key) {
      continue;
    }

    normalized[key] =
      normalizeStoredNonNegativeInteger(rawValue);
  }

  return normalized;
}

function getErrorStatus(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error
  ) {
    const status = Number(
      (error as { status?: unknown }).status,
    );

    if (
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
    ) {
      return status;
    }
  }

  return 500;
}