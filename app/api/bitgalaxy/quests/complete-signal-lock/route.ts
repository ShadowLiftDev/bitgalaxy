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

const MODULE_ID = "bitgalaxy";
const QUEST_ID = "signal-lock";
const FALLBACK_TUTORIAL_XP = 50;

type SignalLockRequestBody = {
  orgId?: unknown;
  memberId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | SignalLockRequestBody
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
            "You can only complete Signal Lock for your own member profile.",
        },
        { status: 403 },
      );
    }

    const memberId = session.memberId;

    const [world, quest] = await Promise.all([
      getWorld(orgId),
      getQuest(orgId, QUEST_ID),
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

    if (!quest || quest.isActive !== true) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Signal Lock is not currently available.",
        },
        { status: 404 },
      );
    }

    const tutorialXP = normalizeQuestXP(
      quest.xp,
      FALLBACK_TUTORIAL_XP,
    );

    const memberRef = adminDb
      .collection("members")
      .doc(memberId);

    const orgLinkRef = memberRef
      .collection("orgLinks")
      .doc(orgId);

    const stateRef = orgLinkRef
      .collection("modules")
      .doc(MODULE_ID)
      .collection("state")
      .doc("current");

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
        ] = await Promise.all([
          transaction.get(memberRef),
          transaction.get(orgLinkRef),
          transaction.get(stateRef),
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

        const completedQuestIds =
          normalizeStringArray(
            stateData.completedQuestIds,
          );

        if (
          completedQuestIds.includes(
            QUEST_ID,
          )
        ) {
          throw new Error(
            "SIGNAL_LOCK_ALREADY_COMPLETED",
          );
        }

        const questCompletionCounts =
          normalizeCompletionCounts(
            stateData.questCompletionCounts,
          );

        const previousTotalXP =
          normalizeStoredNonNegativeInteger(
            stateData.totalXP,
          );

        const resultingTotalXP =
          previousTotalXP +
          tutorialXP;

        const resultingRank =
          getRankForXP(
            resultingTotalXP,
          );

        const resultingLevel =
          getLevelForXP(
            resultingTotalXP,
          );

        const previousWeeklyXP =
          stateData.weeklyWeekKey ===
          weekKey
            ? normalizeStoredNonNegativeInteger(
                stateData.weeklyXP,
              )
            : 0;

        const resultingWeeklyXP =
          previousWeeklyXP +
          tutorialXP;

        const nextCompletedQuestIds = [
          ...completedQuestIds,
          QUEST_ID,
        ];

        const nextCompletionCount =
          (
            questCompletionCounts[
              QUEST_ID
            ] ?? 0
          ) + 1;

        const now =
          FieldValue.serverTimestamp();

        transaction.set(
          stateRef,
          {
            moduleId: MODULE_ID,
            orgId,
            memberId,

            totalXP:
              resultingTotalXP,

            rank:
              resultingRank,

            level:
              resultingLevel,

            weeklyXP:
              resultingWeeklyXP,

            weeklyWeekKey:
              weekKey,

            completedQuestIds:
              nextCompletedQuestIds,

            questCompletionCounts: {
              ...questCompletionCounts,

              [QUEST_ID]:
                nextCompletionCount,
            },

            lastCompletedQuestId:
              QUEST_ID,

            lastQuestCompletedAt:
              now,

            updatedAt:
              now,

            ...(stateSnapshot.exists
              ? {}
              : {
                  activeQuestIds: [],
                  inventory: [],
                  createdAt: now,
                }),
          },
          {
            merge: true,
          },
        );

        transaction.set(
          activityRef,
          {
            activityId:
              activityRef.id,

            system:
              MODULE_ID,

            moduleId:
              MODULE_ID,

            orgId,
            memberId,

            eventType:
              "quest_complete",

            xpChange:
              tutorialXP,

            questId:
              QUEST_ID,

            gameId:
              null,

            rewardId:
              null,

            source:
              "signal_lock_tutorial",

            meta: {
              weekKey,

              tutorialXP,

              previousTotalXP,
              resultingTotalXP,

              previousWeeklyXP,
              resultingWeeklyXP,

              resultingRank,
              resultingLevel,

              completionCount:
                nextCompletionCount,
            },

            occurredAt:
              now,

            createdAt:
              now,
          },
        );

        return {
          questId:
            QUEST_ID,

          completed:
            true,

          tutorialXP,

          weekKey,

          previousTotalXP,
          resultingTotalXP,

          previousWeeklyXP,
          resultingWeeklyXP,

          resultingRank,
          resultingLevel,
        };
      },
    );

    const [activeQuests, player] =
      await Promise.all([
        getActiveQuests(
          orgId,
          memberId,
        ),

        getPlayer(
          orgId,
          memberId,
        ),
      ]);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Signal Lock was completed, but updated member progress could not be loaded.",
        },
        { status: 500 },
      );
    }

    const progress =
      getRankProgress(
        player.totalXP,
      );

    return NextResponse.json({
      success: true,

      orgId,
      memberId,
      questId: QUEST_ID,

      result,
      activeQuests,

      player: {
        memberId:
          player.memberId,

        orgId:
          player.orgId,

        displayName:
          player.displayName ??
          null,

        totalXP:
          player.totalXP,

        rank:
          player.rank,

        level:
          player.level,

        weeklyXP:
          player.weeklyXP,

        weeklyWeekKey:
          player.weeklyWeekKey,

        progress,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[bitgalaxy:complete-signal-lock:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete Signal Lock.";

    if (
      message ===
      "SIGNAL_LOCK_ALREADY_COMPLETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Signal Lock has already been completed for this member.",
        },
        { status: 409 },
      );
    }

    if (
      message.startsWith(
        "MEMBER_NOT_FOUND:",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Member profile not found.",
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

    const status =
      getErrorStatus(error);

    if (status === 401) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized: link your BitGalaxy profile to complete Signal Lock.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          status === 500
            ? "Failed to complete Signal Lock."
            : message,
      },
      { status },
    );
  }
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function normalizeQuestXP(
  value: unknown,
  fallback: number,
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeStoredNonNegativeInteger(
  value: unknown,
): number {
  const parsed =
    Number(value);

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
          (
            entry,
          ): entry is string =>
            typeof entry ===
            "string",
        )
        .map((entry) =>
          entry.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function normalizeCompletionCounts(
  value: unknown,
): Record<string, number> {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const normalized: Record<
    string,
    number
  > = {};

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(value)
  ) {
    const key =
      rawKey.trim();

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

function getErrorStatus(
  error: unknown,
): number {
  if (
    error &&
    typeof error ===
      "object" &&
    "status" in error
  ) {
    const status = Number(
      (
        error as {
          status?: unknown;
        }
      ).status,
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