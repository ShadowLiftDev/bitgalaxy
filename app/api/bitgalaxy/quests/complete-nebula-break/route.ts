import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_ID = "nebula-break";
const MODULE_ID = "bitgalaxy";

const BRICK_COLUMNS = 7;
const SCORE_PER_BRICK = 10;

type DifficultyLevel = 1 | 2 | 3;

type NebulaBreakRequestBody = {
  orgId?: unknown;
  memberId?: unknown;
  level?: unknown;

  stats?: {
    score?: unknown;
    bricks?: unknown;
    timeMs?: unknown;
    cleared?: unknown;
  };
};

type LevelDefinition = {
  level: DifficultyLevel;
  xp: number;
};

type StoredNebulaBreakGame = {
  completed?: unknown;

  weeklyWeekKey?: unknown;
  weeklyBestLevel?: unknown;

  bestLevel?: unknown;
  bestScore?: unknown;
  bestBricks?: unknown;
  bestTimeMs?: unknown;
};

const FALLBACK_LEVELS: LevelDefinition[] = [
  {
    level: 1,
    xp: 75,
  },
  {
    level: 2,
    xp: 150,
  },
  {
    level: 3,
    xp: 225,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | NebulaBreakRequestBody
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
          error:
            "A connected BitGalaxy member session is required.",
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

    const requestedMemberId = normalizeOptionalString(
      body.memberId,
    );

    if (
      requestedMemberId &&
      requestedMemberId !== session.memberId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Session member does not match the requested member.",
        },
        { status: 403 },
      );
    }

    const memberId = session.memberId;

    const requestedLevel = normalizeLevel(body.level);

    if (!requestedLevel) {
      return NextResponse.json(
        {
          success: false,
          error:
            "level must be an integer from 1 through 3.",
        },
        { status: 400 },
      );
    }

    const score = normalizeNonNegativeInteger(
      body.stats?.score,
    );

    const bricks = normalizeNonNegativeInteger(
      body.stats?.bricks,
    );

    const timeMs = normalizePositiveInteger(
      body.stats?.timeMs,
    );

    const cleared = normalizeBoolean(
      body.stats?.cleared,
    );

    if (
      score === null ||
      bricks === null ||
      timeMs === null ||
      cleared === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "score, bricks, timeMs, and cleared must contain valid values.",
        },
        { status: 400 },
      );
    }

    const maximumBricks = getMaximumBricksForLevel(
      requestedLevel,
    );

    if (bricks > maximumBricks) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted brick count exceeds the maximum for the selected tier.",
        },
        { status: 400 },
      );
    }

    const expectedScore = bricks * SCORE_PER_BRICK;

    if (score !== expectedScore) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted score does not match the number of destroyed bricks.",
        },
        { status: 400 },
      );
    }

    if (cleared && bricks !== maximumBricks) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A cleared field must include every brick from the selected tier.",
        },
        { status: 400 },
      );
    }

    if (!cleared && bricks === maximumBricks) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A run that destroyed every brick must be marked as cleared.",
        },
        { status: 400 },
      );
    }

    /*
     * Broad sanity limit only. This is not intended to be
     * complete anti-cheat validation.
     */
    if (timeMs > 3_600_000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted Nebula Break duration is outside the accepted range.",
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
          error:
            "This BitGalaxy world is not currently available.",
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
          error:
            "Nebula Break is not currently available.",
        },
        { status: 404 },
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
          throw new Error(
            `MEMBER_NOT_FOUND:${memberId}`,
          );
        }

        if (!orgLinkSnapshot.exists) {
          throw new Error(
            `MEMBER_NOT_CONNECTED:${memberId}`,
          );
        }

        const stateData =
          stateSnapshot.data() ?? {};

        const gameData = (
          gameSnapshot.data() ?? {}
        ) as StoredNebulaBreakGame;

        const previousWeeklyWeekKey =
          typeof gameData.weeklyWeekKey === "string"
            ? gameData.weeklyWeekKey
            : "";

        const previousWeeklyBestLevel =
          previousWeeklyWeekKey === weekKey
            ? normalizeStoredNonNegativeInteger(
                gameData.weeklyBestLevel,
              )
            : 0;

        const previousWeeklyReward = xpForLevel(
          previousWeeklyBestLevel,
          levelDefinitions,
        );

        const requestedWeeklyReward = xpForLevel(
          requestedLevel,
          levelDefinitions,
        );

        const xpAwarded =
          requestedLevel > previousWeeklyBestLevel
            ? Math.max(
                0,
                requestedWeeklyReward -
                  previousWeeklyReward,
              )
            : 0;

        const previousBestLevel =
          normalizeStoredNonNegativeInteger(
            gameData.bestLevel,
          );

        const previousBestScore =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestScore,
          );

        const previousBestBricks =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestBricks,
          );

        const previousBestTimeMs =
          normalizeStoredNullablePositiveInteger(
            gameData.bestTimeMs,
          );

        let nextBestLevel =
          previousBestLevel;

        let nextBestScore =
          previousBestScore;

        let nextBestBricks =
          previousBestBricks;

        let nextBestTimeMs =
          previousBestTimeMs;

        let statsImproved = false;

        /*
         * Higher difficulty replaces the primary best-run
         * profile. Equal difficulty can improve its stats.
         * Lower difficulty runs remain in lastResult only.
         */
        if (requestedLevel > previousBestLevel) {
          nextBestLevel = requestedLevel;
          nextBestScore = score;
          nextBestBricks = bricks;
          nextBestTimeMs = timeMs;
          statsImproved = true;
        } else if (
          requestedLevel === previousBestLevel
        ) {
          const improvedScore =
            previousBestScore === null ||
            score > previousBestScore;

          const improvedBricks =
            previousBestBricks === null ||
            bricks > previousBestBricks;

          const improvedTime =
            previousBestTimeMs === null ||
            timeMs > previousBestTimeMs;

          if (improvedScore) {
            nextBestScore = score;
          }

          if (improvedBricks) {
            nextBestBricks = bricks;
          }

          if (improvedTime) {
            nextBestTimeMs = timeMs;
          }

          statsImproved =
            improvedScore ||
            improvedBricks ||
            improvedTime;
        }

        const nextWeeklyBestLevel = Math.max(
          previousWeeklyBestLevel,
          requestedLevel,
        );

        const previousTotalXP =
          normalizeStoredNonNegativeInteger(
            stateData.totalXP,
          );

        const resultingTotalXP =
          previousTotalXP + xpAwarded;

        const resultingRank =
          getRankForXP(resultingTotalXP);

        const resultingLevel =
          getLevelForXP(resultingTotalXP);

        const previousWeeklyXP =
          stateData.weeklyWeekKey === weekKey
            ? normalizeStoredNonNegativeInteger(
                stateData.weeklyXP,
              )
            : 0;

        const resultingWeeklyXP =
          previousWeeklyXP + xpAwarded;

        const completedQuestIds =
          normalizeStringArray(
            stateData.completedQuestIds,
          );

        const questCompletionCounts =
          normalizeCompletionCounts(
            stateData.questCompletionCounts,
          );

        const nextCompletedQuestIds =
          completedQuestIds.includes(GAME_ID)
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
            weeklyBestLevel:
              nextWeeklyBestLevel,

            bestLevel: nextBestLevel,
            bestScore: nextBestScore,
            bestBricks: nextBestBricks,
            bestTimeMs: nextBestTimeMs,

            lastResult: {
              level: requestedLevel,

              score,
              bricks,
              timeMs,
              cleared,

              maximumBricks,
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

            completedQuestIds:
              nextCompletedQuestIds,

            questCompletionCounts: {
              ...questCompletionCounts,
              [GAME_ID]:
                nextCompletionCount,
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

          source: "nebula_break",

          meta: {
            weekKey,

            submittedLevel:
              requestedLevel,

            previousWeeklyBestLevel,
            resultingWeeklyBestLevel:
              nextWeeklyBestLevel,

            statsImproved,

            score,
            bricks,
            timeMs,
            cleared,
            maximumBricks,

            previousTotalXP,
            resultingTotalXP,

            resultingRank,
            resultingLevel,

            resultingWeeklyXP,
            weeklyWeekKey: weekKey,
          },

          occurredAt: now,
          createdAt: now,
        });

        return {
          weekKey,

          submittedLevel:
            requestedLevel,

          weeklyBestLevel:
            nextWeeklyBestLevel,

          xpAwarded,
          statsImproved,

          bestLevel:
            nextBestLevel,

          bestScore:
            nextBestScore,

          bestBricks:
            nextBestBricks,

          bestTimeMs:
            nextBestTimeMs,

          cleared,
          maximumBricks,
        };
      },
    );

    const [player, activeQuests] =
      await Promise.all([
        getPlayer(orgId, memberId),
        getActiveQuests(orgId, memberId),
      ]);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nebula Break was recorded, but updated member progress could not be loaded.",
        },
        { status: 500 },
      );
    }

    const progress = getRankProgress(
      player.totalXP,
    );

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

        displayName:
          player.displayName ?? null,

        totalXP: player.totalXP,
        rank: player.rank,
        level: player.level,

        weeklyXP: player.weeklyXP,
        weeklyWeekKey:
          player.weeklyWeekKey,

        progress,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[bitgalaxy:complete-nebula-break:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete Nebula Break.";

    if (
      message.startsWith(
        "MEMBER_NOT_FOUND:",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Member profile not found.",
        },
        { status: 404 },
      );
    }

    if (
      message.startsWith(
        "MEMBER_NOT_CONNECTED:",
      )
    ) {
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
            ? "Failed to complete Nebula Break."
            : message,
      },
      { status },
    );
  }
}

function getMaximumBricksForLevel(
  level: DifficultyLevel,
): number {
  const rows =
    5 + (level - 1) * 2;

  return rows * BRICK_COLUMNS;
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

function normalizeLevel(
  value: unknown,
): DifficultyLevel | null {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > 3
  ) {
    return null;
  }

  return parsed as DifficultyLevel;
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

function normalizeBoolean(
  value: unknown,
): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
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

  const normalized: Record<string, number> =
    {};

  for (const [rawKey, rawValue] of Object.entries(
    value,
  )) {
    const key = rawKey.trim();

    if (!key) {
      continue;
    }

    normalized[key] =
      normalizeStoredNonNegativeInteger(
        rawValue,
      );
  }

  return normalized;
}

function resolveLevelDefinitions(
  metadata: unknown,
  fallbackXP: number,
): LevelDefinition[] {
  const metadataRecord =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? (metadata as Record<
          string,
          unknown
        >)
      : {};

  const rawLevels = Array.isArray(
    metadataRecord.levels,
  )
    ? metadataRecord.levels
    : [];

  const normalizedFallbackXP = Math.max(
    0,
    Math.floor(
      Number.isFinite(Number(fallbackXP))
        ? Number(fallbackXP)
        : 75,
    ),
  );

  return FALLBACK_LEVELS.map(
    (fallbackDefinition) => {
      const configuredDefinition =
        rawLevels.find((entry) => {
          if (
            !entry ||
            typeof entry !== "object" ||
            Array.isArray(entry)
          ) {
            return false;
          }

          return (
            Number(
              (
                entry as Record<
                  string,
                  unknown
                >
              ).level,
            ) === fallbackDefinition.level
          );
        });

      if (
        !configuredDefinition ||
        typeof configuredDefinition !==
          "object"
      ) {
        return {
          level:
            fallbackDefinition.level,

          xp:
            fallbackDefinition.level *
            normalizedFallbackXP,
        };
      }

      const configuredData =
        configuredDefinition as Record<
          string,
          unknown
        >;

      const configuredXP =
        normalizeStoredNonNegativeInteger(
          configuredData.xp,
        );

      return {
        level:
          fallbackDefinition.level,

        xp:
          configuredXP > 0
            ? configuredXP
            : fallbackDefinition.level *
              normalizedFallbackXP,
      };
    },
  );
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
      (definition) =>
        definition.level === level,
    )?.xp ?? 0
  );
}

function getErrorStatus(
  error: unknown,
): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error
  ) {
    const status = Number(
      (error as { status?: unknown })
        .status,
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