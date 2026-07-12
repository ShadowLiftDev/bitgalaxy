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

const GAME_ID = "galaxy-paddle";
const MODULE_ID = "bitgalaxy";

type DifficultyLevel = 1 | 2 | 3;

type GalaxyPaddleRequestBody = {
  orgId?: unknown;
  memberId?: unknown;
  level?: unknown;
  stats?: {
    hits?: unknown;
    timeMs?: unknown;
    maxSpeed?: unknown;
  };
};

type LevelDefinition = {
  level: DifficultyLevel;
  xp: number;
};

type StoredGalaxyPaddleGame = {
  completed?: unknown;

  weeklyWeekKey?: unknown;
  weeklyBestLevel?: unknown;

  bestLevel?: unknown;
  bestHits?: unknown;
  bestTimeMs?: unknown;
  bestMaxSpeed?: unknown;
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
      | GalaxyPaddleRequestBody
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
          error: "level must be an integer from 1 through 3.",
        },
        { status: 400 },
      );
    }

    const hits = normalizeNonNegativeInteger(body.stats?.hits);
    const timeMs = normalizePositiveInteger(body.stats?.timeMs);
    const maxSpeed = normalizeNonNegativeNumber(
      body.stats?.maxSpeed,
    );

    if (
      hits === null ||
      timeMs === null ||
      maxSpeed === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "hits, timeMs, and maxSpeed must contain valid numeric values.",
        },
        { status: 400 },
      );
    }

    /*
     * These are broad sanity limits, not full anti-cheat protection.
     */
    if (
      hits > 100_000 ||
      timeMs > 3_600_000 ||
      maxSpeed > 100_000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted Galaxy Paddle statistics are outside the accepted range.",
        },
        { status: 400 },
      );
    }

    const justifiedLevel =
      computeGalaxyPaddleTierFromStats({
        hits,
        timeMs,
      });

    const finalLevel = Math.min(
      requestedLevel,
      justifiedLevel,
    ) as DifficultyLevel;

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
            "Galaxy Paddle is not currently available.",
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

        const stateData = stateSnapshot.data() ?? {};

        const gameData = (
          gameSnapshot.data() ?? {}
        ) as StoredGalaxyPaddleGame;

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
          finalLevel,
          levelDefinitions,
        );

        const xpAwarded =
          finalLevel > previousWeeklyBestLevel
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

        const previousBestHits =
          normalizeStoredNullableNonNegativeInteger(
            gameData.bestHits,
          );

        const previousBestTimeMs =
          normalizeStoredNullablePositiveInteger(
            gameData.bestTimeMs,
          );

        const previousBestMaxSpeed =
          normalizeStoredNullableNonNegativeNumber(
            gameData.bestMaxSpeed,
          );

        const nextBestLevel = Math.max(
          previousBestLevel,
          finalLevel,
        );

        const nextBestHits =
          previousBestHits === null
            ? hits
            : Math.max(previousBestHits, hits);

        const nextBestTimeMs =
          previousBestTimeMs === null
            ? timeMs
            : Math.max(previousBestTimeMs, timeMs);

        const nextBestMaxSpeed =
          previousBestMaxSpeed === null
            ? maxSpeed
            : Math.max(previousBestMaxSpeed, maxSpeed);

        const statsImproved =
          previousBestLevel === 0 ||
          finalLevel > previousBestLevel ||
          previousBestHits === null ||
          hits > previousBestHits ||
          previousBestTimeMs === null ||
          timeMs > previousBestTimeMs ||
          previousBestMaxSpeed === null ||
          maxSpeed > previousBestMaxSpeed;

        const nextWeeklyBestLevel = Math.max(
          previousWeeklyBestLevel,
          finalLevel,
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
            bestHits: nextBestHits,
            bestTimeMs: nextBestTimeMs,
            bestMaxSpeed: nextBestMaxSpeed,

            lastResult: {
              requestedLevel,
              justifiedLevel,
              level: finalLevel,

              hits,
              timeMs,
              maxSpeed,

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

          source: "galaxy_paddle",

          meta: {
            weekKey,

            requestedLevel,
            justifiedLevel,
            submittedLevel: finalLevel,

            previousWeeklyBestLevel,
            resultingWeeklyBestLevel:
              nextWeeklyBestLevel,

            statsImproved,

            hits,
            timeMs,
            maxSpeed,

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

          requestedLevel,
          justifiedLevel,
          submittedLevel: finalLevel,

          weeklyBestLevel:
            nextWeeklyBestLevel,

          xpAwarded,
          statsImproved,

          bestLevel: nextBestLevel,
          bestHits: nextBestHits,
          bestTimeMs: nextBestTimeMs,
          bestMaxSpeed: nextBestMaxSpeed,
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
            "Galaxy Paddle was recorded, but updated member progress could not be loaded.",
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
      "[bitgalaxy:complete-galaxy-paddle:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete Galaxy Paddle.";

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
            ? "Failed to complete Galaxy Paddle."
            : message,
      },
      { status },
    );
  }
}

function computeGalaxyPaddleTierFromStats({
  hits,
  timeMs,
}: {
  hits: number;
  timeMs: number;
}): DifficultyLevel {
  const seconds = timeMs / 1000;

  if (seconds >= 45 || hits >= 30) {
    return 3;
  }

  if (seconds >= 25 || hits >= 15) {
    return 2;
  }

  return 1;
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

function normalizeNonNegativeNumber(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
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

function normalizeStoredNullableNonNegativeNumber(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
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
        : 50,
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