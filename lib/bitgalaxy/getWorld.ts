import { adminDb } from "@/lib/firebase-admin";

export interface BitGalaxyWorldDetail {
  orgId: string;
  name: string;
  headline: string | null;
  description: string | null;
  locationLabel: string | null;
  logoUrl: string | null;

  status: "active" | "inactive";
  theme: string;

  allowPublicAccess: boolean;
  allowPublicJoin: boolean;
  guestModeEnabled: boolean;
  leaderboardEnabled: boolean;

  xpPerCheckin: number;
  defaultGameCompletionXp: number;
  defaultProgramId: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function toNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function resolveStatus(
  value: unknown,
): "active" | "inactive" {
  return value === "active"
    ? "active"
    : "inactive";
}

function resolveWorldName(
  orgId: string,
  orgData: FirebaseFirestore.DocumentData,
  configData: FirebaseFirestore.DocumentData,
): string {
  return (
    toNullableString(configData.worldName) ??
    toNullableString(orgData.displayName) ??
    toNullableString(orgData.name) ??
    orgId
  );
}

function resolveCreatedAt(
  orgData: FirebaseFirestore.DocumentData,
  configData: FirebaseFirestore.DocumentData,
): string | null {
  return (
    toNullableString(configData.createdAt) ??
    toNullableString(orgData.createdAt)
  );
}

function resolveUpdatedAt(
  orgData: FirebaseFirestore.DocumentData,
  configData: FirebaseFirestore.DocumentData,
): string | null {
  return (
    toNullableString(configData.updatedAt) ??
    toNullableString(orgData.updatedAt)
  );
}

export async function getWorld(
  orgId: string,
): Promise<BitGalaxyWorldDetail | null> {
  const normalizedOrgId = orgId.trim();

  if (!normalizedOrgId) {
    throw new Error(
      "getWorld: orgId is required",
    );
  }

  const orgRef = adminDb
    .collection("orgs")
    .doc(normalizedOrgId);

  const [orgSnapshot, configSnapshot] =
    await Promise.all([
      orgRef.get(),
      orgRef
        .collection("modules")
        .doc("bitgalaxy")
        .collection("config")
        .doc("current")
        .get(),
    ]);

  if (
    !orgSnapshot.exists ||
    !configSnapshot.exists
  ) {
    return null;
  }

  const orgData = orgSnapshot.data() ?? {};
  const configData =
    configSnapshot.data() ?? {};

  return {
    orgId: normalizedOrgId,
    name: resolveWorldName(
      normalizedOrgId,
      orgData,
      configData,
    ),
    headline: toNullableString(
      configData.publicHeadline,
    ),
    description: toNullableString(
      configData.publicDescription,
    ),
    locationLabel: toNullableString(
      configData.locationLabel,
    ),
    logoUrl:
      toNullableString(configData.logoUrl) ??
      toNullableString(orgData.logoUrl) ??
      toNullableString(
        orgData.branding?.logoUrl,
      ),

    status: resolveStatus(
      configData.status,
    ),
    theme:
      toNullableString(configData.theme) ??
      "neon",

    allowPublicAccess:
      configData.allowPublicAccess === true,
    allowPublicJoin:
      configData.allowPublicJoin === true,
    guestModeEnabled:
      configData.allowGuestMode === true,
    leaderboardEnabled:
      configData.allowLeaderboard === true,

    xpPerCheckin: toNonNegativeInteger(
      configData.xpPerCheckin,
      0,
    ),
    defaultGameCompletionXp:
      toNonNegativeInteger(
        configData.defaultGameCompletionXp,
        50,
      ),
    defaultProgramId: toNullableString(
      configData.defaultProgramId,
    ),

    createdAt: resolveCreatedAt(
      orgData,
      configData,
    ),
    updatedAt: resolveUpdatedAt(
      orgData,
      configData,
    ),
  };
}