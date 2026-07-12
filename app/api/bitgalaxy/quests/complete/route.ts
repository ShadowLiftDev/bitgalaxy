import { NextRequest, NextResponse } from "next/server";

import { completeQuest } from "@/lib/bitgalaxy/completeQuest";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CompleteQuestRequestBody = {
  orgId?: unknown;
  questId?: unknown;
  memberId?: unknown;
};

export async function POST(
  request: NextRequest,
) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as
      | CompleteQuestRequestBody
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

    const orgId = normalizeRequiredString(
      body.orgId,
    );

    const questId = normalizeRequiredString(
      body.questId,
    );

    if (!orgId || !questId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orgId or questId.",
        },
        { status: 400 },
      );
    }

    const session = requirePlayerSession(
      request,
    );

    if (!session?.memberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Link your BitGalaxy profile before completing quests.",
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

    const quest = await getQuest(
      orgId,
      questId,
    );

    if (!quest) {
      return NextResponse.json(
        {
          success: false,
          error: "Quest not found.",
        },
        { status: 404 },
      );
    }

    if (!quest.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Quest is not active.",
        },
        { status: 400 },
      );
    }

    if (quest.type === "arcade") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Arcade quests must be completed through their game-specific completion endpoint.",
        },
        { status: 400 },
      );
    }

    if (quest.type === "checkin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Check-in quests must be completed through the check-in endpoint.",
        },
        { status: 400 },
      );
    }

    const completion = await completeQuest(
      orgId,
      memberId,
      questId,
    );

    const [activeQuests, player] =
      await Promise.all([
        getActiveQuests(orgId, memberId),
        getPlayer(orgId, memberId),
      ]);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Member progress could not be loaded after completing the quest.",
        },
        { status: 404 },
      );
    }

    const progress = getRankProgress(
      player.totalXP,
    );

    return NextResponse.json({
      success: true,

      orgId,
      memberId,
      questId,

      completion: {
        actuallyCompleted:
          completion.actuallyCompleted,
        xpAwarded:
          completion.xpAwarded,
        completionCount:
          completion.completionCount,
        completionLimit:
          completion.completionLimit,
      },

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
      "[bitgalaxy:quests:complete:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete quest.";

    const status =
      getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        error: message,
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

function getErrorStatus(
  error: unknown,
): number {
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

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes(
      "not found",
    )
  ) {
    return 404;
  }

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes(
      "not connected",
    )
  ) {
    return 403;
  }

  return 500;
}