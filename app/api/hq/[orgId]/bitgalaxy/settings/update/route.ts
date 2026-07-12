import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  orgId: string;
};

type BitGalaxyStatus = "active" | "inactive";
type BitGalaxyTheme = "neon" | "retro" | "cyber";

type UpdateSettingsBody = {
  status?: unknown;
  theme?: unknown;

  allowPublicAccess?: unknown;
  allowPublicJoin?: unknown;
  allowGuestMode?: unknown;
  allowLeaderboard?: unknown;

  worldName?: unknown;
  publicHeadline?: unknown;
  publicDescription?: unknown;
  locationLabel?: unknown;
  logoUrl?: unknown;

  xpPerCheckin?: unknown;
  defaultGameCompletionXp?: unknown;
  defaultProgramId?: unknown;
};

const ALLOWED_STATUSES: BitGalaxyStatus[] = [
  "active",
  "inactive",
];

const ALLOWED_THEMES: BitGalaxyTheme[] = [
  "neon",
  "retro",
  "cyber",
];

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Expected a string value.");
  }

  return value.trim();
}

function normalizeNullableString(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected a string or null value.");
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `${fieldName} must be a non-negative number.`,
    );
  }

  return Math.floor(parsed);
}

function normalizeStatus(value: unknown): BitGalaxyStatus {
  if (
    typeof value !== "string" ||
    !ALLOWED_STATUSES.includes(
      value as BitGalaxyStatus,
    )
  ) {
    throw new Error(
      `status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
    );
  }

  return value as BitGalaxyStatus;
}

function normalizeTheme(value: unknown): BitGalaxyTheme {
  if (
    typeof value !== "string" ||
    !ALLOWED_THEMES.includes(
      value as BitGalaxyTheme,
    )
  ) {
    throw new Error(
      `theme must be one of: ${ALLOWED_THEMES.join(", ")}.`,
    );
  }

  return value as BitGalaxyTheme;
}

function isErrorWithStatus(
  error: unknown,
): error is Error & { status?: number } {
  return error instanceof Error;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<Params>;
  },
) {
  try {
    const { orgId: rawOrgId } = await context.params;
    const orgId = rawOrgId?.trim();

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orgId in route.",
        },
        { status: 400 },
      );
    }

    const user = await requireUser(request);

    await requireRole(
      orgId,
      user.uid,
      ["owner"],
      request,
    );

    const body = (await request
      .json()
      .catch(() => null)) as UpdateSettingsBody | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();

    const configRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("modules")
      .doc("bitgalaxy")
      .collection("config")
      .doc("current");

    const existingSnapshot = await configRef.get();
    const existingData = existingSnapshot.data() ?? {};

    const updateData: Record<string, unknown> = {
      moduleId: "bitgalaxy",
      orgId,
      updatedAt: nowIso,
    };

    if ("status" in body) {
      updateData.status = normalizeStatus(body.status);
    }

    if ("theme" in body) {
      updateData.theme = normalizeTheme(body.theme);
    }

    if ("allowPublicAccess" in body) {
      updateData.allowPublicAccess = normalizeBoolean(
        body.allowPublicAccess,
        "allowPublicAccess",
      );
    }

    if ("allowPublicJoin" in body) {
      updateData.allowPublicJoin = normalizeBoolean(
        body.allowPublicJoin,
        "allowPublicJoin",
      );
    }

    if ("allowGuestMode" in body) {
      updateData.allowGuestMode = normalizeBoolean(
        body.allowGuestMode,
        "allowGuestMode",
      );
    }

    if ("allowLeaderboard" in body) {
      updateData.allowLeaderboard = normalizeBoolean(
        body.allowLeaderboard,
        "allowLeaderboard",
      );
    }

    if ("worldName" in body) {
      updateData.worldName = normalizeRequiredString(
        body.worldName,
        "worldName",
      );
    }

    if ("publicHeadline" in body) {
      updateData.publicHeadline =
        normalizeOptionalString(body.publicHeadline);
    }

    if ("publicDescription" in body) {
      updateData.publicDescription =
        normalizeOptionalString(
          body.publicDescription,
        );
    }

    if ("locationLabel" in body) {
      updateData.locationLabel =
        normalizeOptionalString(body.locationLabel);
    }

    if ("logoUrl" in body) {
      updateData.logoUrl = normalizeOptionalString(
        body.logoUrl,
      );
    }

    if ("xpPerCheckin" in body) {
      updateData.xpPerCheckin =
        normalizeNonNegativeInteger(
          body.xpPerCheckin,
          "xpPerCheckin",
        );
    }

    if ("defaultGameCompletionXp" in body) {
      updateData.defaultGameCompletionXp =
        normalizeNonNegativeInteger(
          body.defaultGameCompletionXp,
          "defaultGameCompletionXp",
        );
    }

    if ("defaultProgramId" in body) {
      updateData.defaultProgramId =
        normalizeNullableString(
          body.defaultProgramId,
        );
    }

    if (!existingSnapshot.exists) {
      updateData.createdAt = nowIso;
    } else if (!existingData.createdAt) {
      updateData.createdAt = nowIso;
    }

    await configRef.set(updateData, {
      merge: true,
    });

    const savedSnapshot = await configRef.get();

    return NextResponse.json({
      success: true,
      config: {
        id: savedSnapshot.id,
        ...(savedSnapshot.data() ?? {}),
      },
    });
  } catch (error: unknown) {
    console.error(
      "[bitgalaxy:settings:update:POST]",
      error,
    );

    const status =
      isErrorWithStatus(error) &&
      typeof error.status === "number"
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update BitGalaxy settings.",
      },
      { status },
    );
  }
}