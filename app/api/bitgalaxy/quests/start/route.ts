import { NextRequest, NextResponse } from "next/server";

import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";
import { startQuest } from "@/lib/bitgalaxy/startQuest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type StartQuestRequestBody = {
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
      | StartQuestRequestBody
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
          error: "No member session found.",
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
            "Arcade games are started through their game page.",
        },
        { status: 400 },
      );
    }

    if (quest.type === "checkin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Check-in quests are handled through the check-in endpoint.",
        },
        { status: 400 },
      );
    }

    await startQuest(
      orgId,
      memberId,
      questId,
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
            "Member progress could not be loaded after starting the quest.",
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

      quest,
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
      "[bitgalaxy:quests:start:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to start quest.";

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

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes(
      "completion limit",
    )
  ) {
    return 409;
  }

  return 500;
}