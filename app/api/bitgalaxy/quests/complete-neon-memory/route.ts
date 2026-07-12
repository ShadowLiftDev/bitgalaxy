import {
  FieldValue,
} from "firebase-admin/firestore";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getWorld } from "@/lib/bitgalaxy/getWorld";
import {
  getRankForXP,
  getRankProgress,
} from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_ID = "neon-memory";
const MODULE_ID = "bitgalaxy";

type DifficultyLevel = 1 | 2 | 3;

type NeonMemoryRequestBody = {
  orgId?: unknown;
  memberId?: unknown;
  level?: unknown;
  stats?: {
    moves?: unknown;
    timeMs?: unknown;
    pairs?: unknown;
  };
};

type LevelDefinition = {
  level: DifficultyLevel;
  xp: number;
  pairs: number;
};

type StoredGameData = {
  weeklyWeekKey?: unknown;
  weeklyBestLevel?: unknown;

  bestLevel?: unknown;
  bestMoves?: unknown;
  bestTimeMs?: unknown;

  completed?: unknown;
};

const FALLBACK_LEVELS: LevelDefinition[] = [
  {
    level: 1,
    xp: 50,
    pairs: 8,
  },
  {
    level: 2,
    xp: 100,
    pairs: 10,
  },
  {
    level: 3,
    xp: 150,
    pairs: 12,
  },
];

export async function POST(
  request: NextRequest,
) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as
      | NeonMemoryRequestBody
      | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const orgId =
      normalizeRequiredString(body.orgId);

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orgId.",
        },
        { status: 400 },
      );
    }

    const session =
      requirePlayerSession(request);

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

    const requestedMemberId =
      normalizeOptionalString(body.memberId);

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

    const requestedLevel =
      normalizeLevel(body.level);

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

    const moves = normalizePositiveInteger(
      body.stats?.moves,
    );

    const timeMs = normalizePositiveInteger(
      body.stats?.timeMs,
    );

    const pairs = normalizePositiveInteger(
      body.stats?.pairs,
    );

    if (
      moves === null ||
      timeMs === null ||
      pairs === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "moves, timeMs, and pairs must be positive whole numbers.",
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
      !quest.isActive ||
      quest.type !== "arcade"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Neon Memory is not currently available.",
        },
        { status: 404 },
      );
    }

    const levelDefinitions =
      resolveLevelDefinitions(
        quest.metadata,
        quest.xp,
      );

    const selectedLevel =
      levelDefinitions.find(
        (entry) =>
          entry.level === requestedLevel,
      );

    if (!selectedLevel) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected Neon Memory tier is not configured.",
        },
        { status: 400 },
      );
    }

    if (pairs !== selectedLevel.pairs) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted pair count does not match the selected tier.",
        },
        { status: 400 },
      );
    }

    /*
     * Memory games require at least one move per pair.
     * Generous upper bounds protect Firestore from
     * malformed submissions without pretending to be
     * full anti-cheat protection.
     */
    if (
      moves < pairs ||
      moves > 10000 ||
      timeMs < 500 ||
      timeMs > 3_600_000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Submitted Neon Memory statistics are outside the accepted range.",
        },
        { status: 400 },
      );
    }

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

    const weekKey = getISOWeekKey(
      new Date(),
    );

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
        ) as StoredGameData;

        const previousWeeklyWeekKey =
          typeof gameData.weeklyWeekKey ===
          "string"
            ? gameData.weeklyWeekKey
            : "";

        const previousWeeklyBestLevel =
          previousWeeklyWeekKey === weekKey
            ? normalizeNonNegativeInteger(
                gameData.weeklyBestLevel,
              )
            : 0;

        const previousWeeklyReward =
          xpForLevel(
            previousWeeklyBestLevel,
            levelDefinitions,
          );

        const requestedWeeklyReward =
          xpForLevel(
            requestedLevel,
            levelDefinitions,
          );

        const xpAwarded =
          requestedLevel >
          previousWeeklyBestLevel
            ? Math.max(
                0,
                requestedWeeklyReward -
                  previousWeeklyReward,
              )
            : 0;

        const previousBestLevel =
          normalizeNonNegativeInteger(
            gameData.bestLevel,
          );

        const previousBestMoves =
          normalizeNullablePositiveInteger(
            gameData.bestMoves,
          );

        const previousBestTimeMs =
          normalizeNullablePositiveInteger(
            gameData.bestTimeMs,
          );

        let nextBestLevel =
          previousBestLevel;

        let nextBestMoves =
          previousBestMoves;

        let nextBestTimeMs =
          previousBestTimeMs;

        let statsImproved = false;

        if (
          requestedLevel > previousBestLevel
        ) {
          nextBestLevel = requestedLevel;
          nextBestMoves = moves;
          nextBestTimeMs = timeMs;
          statsImproved = true;
        } else if (
          requestedLevel === previousBestLevel
        ) {
          const improvedMoves =
            previousBestMoves === null ||
            moves < previousBestMoves;

          const improvedTime =
            previousBestTimeMs === null ||
            timeMs < previousBestTimeMs;

          if (improvedMoves) {
            nextBestMoves = moves;
          }

          if (improvedTime) {
            nextBestTimeMs = timeMs;
          }

          statsImproved =
            improvedMoves || improvedTime;
        }

        const nextWeeklyBestLevel =
          Math.max(
            previousWeeklyBestLevel,
            requestedLevel,
          );

        const currentXP =
          normalizeNonNegativeInteger(
            stateData.totalXP,
          );

        const newXP =
          currentXP + xpAwarded;

        const newRank =
          getRankForXP(newXP);

        const newLevel =
          getLevelForXP(newXP);

        const previousWeeklyXP =
          stateData.weeklyWeekKey === weekKey
            ? normalizeNonNegativeInteger(
                stateData.weeklyXP,
              )
            : 0;

        const newWeeklyXP =
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
            : [
                ...completedQuestIds,
                GAME_ID,
              ];

        const nextCompletionCount =
          (questCompletionCounts[GAME_ID] ??
            0) + 1;

        const now =
          FieldValue.serverTimestamp();

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
            bestMoves: nextBestMoves,
            bestTimeMs: nextBestTimeMs,

            lastResult: {
              level: requestedLevel,
              moves,
              timeMs,
              pairs,
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

            totalXP: newXP,
            rank: newRank,
            level: newLevel,

            weeklyXP: newWeeklyXP,
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
          rewardId: null,
          gameId: GAME_ID,

          source: "neon_memory",

          meta: {
            weekKey,

            submittedLevel:
              requestedLevel,
            previousWeeklyBestLevel,
            resultingWeeklyBestLevel:
              nextWeeklyBestLevel,

            statsImproved,

            moves,
            timeMs,
            pairs,

            previousTotalXP:
              currentXP,
            resultingTotalXP: newXP,

            resultingRank: newRank,
            resultingLevel: newLevel,

            weeklyWeekKey: weekKey,
            resultingWeeklyXP:
              newWeeklyXP,
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

          bestLevel: nextBestLevel,
          bestMoves: nextBestMoves,
          bestTimeMs: nextBestTimeMs,
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
            "Neon Memory was recorded, but updated member progress could not be loaded.",
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
      "[bitgalaxy:complete-neon-memory:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete Neon Memory.";

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
            ? "Failed to complete Neon Memory."
            : message,
      },
      { status },
    );
  }
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

function normalizeNullablePositiveInteger(
  value: unknown,
): number | null {
  return normalizePositiveInteger(value);
}

function normalizeNonNegativeInteger(
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

  const result: Record<string, number> =
    {};

  for (const [key, rawCount] of Object.entries(
    value,
  )) {
    const count =
      normalizeNonNegativeInteger(rawCount);

    if (key.trim()) {
      result[key] = count;
    }
  }

  return result;
}

function resolveLevelDefinitions(
  metadata: Record<string, unknown>,
  fallbackXP: number,
): LevelDefinition[] {
  const rawLevels =
    Array.isArray(metadata.levels)
      ? metadata.levels
      : [];

  const fallbackBaseXP = Math.max(
    0,
    Math.floor(
      Number.isFinite(fallbackXP)
        ? fallbackXP
        : 50,
    ),
  );

  const definitions =
    FALLBACK_LEVELS.map(
      (fallbackLevel) => {
        const configured =
          rawLevels.find((entry) => {
            if (
              !entry ||
              typeof entry !== "object"
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
              ) === fallbackLevel.level
            );
          });

        if (
          !configured ||
          typeof configured !== "object"
        ) {
          return {
            ...fallbackLevel,
            xp:
              fallbackLevel.level *
              fallbackBaseXP,
          };
        }

        const configuredData =
          configured as Record<
            string,
            unknown
          >;

        const xp =
          normalizeNonNegativeInteger(
            configuredData.xp,
          );

        const pairs =
          normalizePositiveInteger(
            configuredData.pairs,
          );

        return {
          level: fallbackLevel.level,
          xp:
            xp > 0
              ? xp
              : fallbackLevel.level *
                fallbackBaseXP,
          pairs:
            pairs ??
            fallbackLevel.pairs,
        };
      },
    );

  return definitions;
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
      (entry) => entry.level === level,
    )?.xp ?? 0
  );
}

function getLevelForXP(
  totalXP: number,
): number {
  const normalizedXP = Math.max(
    0,
    Math.floor(totalXP),
  );

  return (
    Math.floor(normalizedXP / 1000) + 1
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