import { NextRequest, NextResponse } from "next/server";

import { handleCheckin } from "@/lib/bitgalaxy/checkin";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requirePlayerSession } from "@/lib/bitgalaxy/playerSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckinRequestBody = {
  orgId?: unknown;
  code?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | CheckinRequestBody
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

    const code = normalizeOptionalString(body.code);

    const session = requirePlayerSession(request);

    if (!session?.memberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A connected BitGalaxy member session is required to check in.",
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

    const memberId = session.memberId;

    const result = await handleCheckin(
      orgId,
      memberId,
      code,
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
            "Check-in was processed, but updated member progress could not be loaded.",
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
      "[bitgalaxy:checkin:POST]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to process check-in.";

    const status = getErrorStatus(error);

    if (status === 401) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized: link your BitGalaxy profile to check in.",
        },
        { status: 401 },
      );
    }

    if (status === 403) {
      return NextResponse.json(
        {
          success: false,
          error:
            message ||
            "You are not authorized to check in to this organization.",
        },
        { status: 403 },
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

    return NextResponse.json(
      {
        success: false,
        error:
          status === 500
            ? "Failed to process check-in."
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