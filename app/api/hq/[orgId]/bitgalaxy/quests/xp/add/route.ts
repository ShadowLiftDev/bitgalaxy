import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import {
  getLevelForXP,
  getRankForXP,
  getRankProgress,
} from "@/lib/bitgalaxy/rankEngine";
import { getISOWeekKey } from "@/lib/weekKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODULE_ID = "bitgalaxy";

type RouteContext = {
  params: Promise<{
    orgId: string;
  }>;
};

type AddXPRequestBody = {
  memberId?: unknown;
  deltaXP?: unknown;

  source?: unknown;
  questId?: unknown;
  rewardId?: unknown;
  meta?: unknown;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { orgId: rawOrgId } = await context.params;
    const orgId = normalizeRequiredString(rawOrgId);

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing organization ID.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | AddXPRequestBody
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

    const memberId = normalizeRequiredString(body.memberId);
    const deltaXP = normalizeInteger(body.deltaXP);

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing memberId.",
        },
        { status: 400 },
      );
    }

    if (deltaXP === null || deltaXP === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "deltaXP must be a non-zero integer.",
        },
        { status: 400 },
      );
    }

    const actingUser = await requireUser(request);

    await requireRole(
      orgId,
      actingUser.uid,
      ["owner", "admin", "staff"],
      request,
    );

    const source =
      normalizeOptionalString(body.source) ??
      "manual";

    const questId =
      normalizeOptionalString(body.questId);

    const rewardId =
      normalizeOptionalString(body.rewardId);

    const meta = normalizeMetadata(body.meta);

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

        const previousTotalXP =
          normalizeStoredNonNegativeInteger(
            stateData.totalXP,
          );

        /*
         * Manual deductions cannot reduce total XP below zero.
         */
        const resultingTotalXP = Math.max(
          0,
          previousTotalXP + deltaXP,
        );

        const appliedDeltaXP =
          resultingTotalXP -
          previousTotalXP;

        if (appliedDeltaXP === 0) {
          throw new Error(
            "XP_ADJUSTMENT_NO_CHANGE",
          );
        }

        const previousWeeklyXP =
          stateData.weeklyWeekKey === weekKey
            ? normalizeStoredNonNegativeInteger(
                stateData.weeklyXP,
              )
            : 0;

        /*
         * Weekly XP also remains non-negative.
         *
         * A negative manual adjustment reduces the current
         * week's XP only when the state is already in the
         * current ISO week.
         */
        const resultingWeeklyXP = Math.max(
          0,
          previousWeeklyXP +
            appliedDeltaXP,
        );

        const resultingRank =
          getRankForXP(resultingTotalXP);

        const resultingLevel =
          getLevelForXP(resultingTotalXP);

        const now =
          FieldValue.serverTimestamp();

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

            updatedAt: now,

            ...(stateSnapshot.exists
              ? {}
              : {
                  activeQuestIds: [],
                  completedQuestIds: [],
                  questCompletionCounts: {},
                  inventory: [],
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

          eventType: "xp_adjustment",
          xpChange: appliedDeltaXP,

          questId,
          gameId: null,
          rewardId,

          source,

          actor: {
            type: "staff",
            userId: actingUser.uid,
          },

          meta: {
            ...meta,

            requestedDeltaXP:
              deltaXP,

            appliedDeltaXP,

            previousTotalXP,
            resultingTotalXP,

            previousWeeklyXP,
            resultingWeeklyXP,

            resultingRank,
            resultingLevel,

            weeklyWeekKey: weekKey,
          },

          occurredAt: now,
          createdAt: now,
        });

        return {
          activityId:
            activityRef.id,

          requestedDeltaXP:
            deltaXP,

          appliedDeltaXP,

          previousTotalXP,
          resultingTotalXP,

          previousWeeklyXP,
          resultingWeeklyXP,

          resultingRank,
          resultingLevel,

          weeklyWeekKey: weekKey,
        };
      },
    );

    const player = await getPlayer(
      orgId,
      memberId,
    );

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "XP was adjusted, but updated member progress could not be loaded.",
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

      result,

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
      "[hq:bitgalaxy:xp:add:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to adjust XP.";

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

    if (
      message ===
      "XP_ADJUSTMENT_NO_CHANGE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The requested adjustment would not change the member’s XP.",
        },
        { status: 409 },
      );
    }

    const status =
      getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        error:
          status === 500
            ? "Failed to adjust XP."
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

function normalizeInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed)
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

function normalizeMetadata(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
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