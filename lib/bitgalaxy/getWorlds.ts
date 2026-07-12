import { adminDb } from "@/lib/firebase-admin";

export interface BitGalaxyWorld {
  orgId: string;
  name: string;
  headline: string | null;
  description: string | null;
  locationLabel: string | null;
  logoUrl: string | null;
  theme: string;
  guestModeEnabled: boolean;
  publicJoinEnabled: boolean;
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

function isPublicActiveWorld(
  configData: FirebaseFirestore.DocumentData,
): boolean {
  return (
    configData.status === "active" &&
    configData.allowPublicAccess === true
  );
}

export async function getWorlds(): Promise<BitGalaxyWorld[]> {
  const orgsSnapshot = await adminDb
    .collection("orgs")
    .get();

  const worldResults = await Promise.all(
    orgsSnapshot.docs.map(async (orgDocument) => {
      const orgId = orgDocument.id;
      const orgData = orgDocument.data();

      const configSnapshot = await orgDocument.ref
        .collection("modules")
        .doc("bitgalaxy")
        .collection("config")
        .doc("current")
        .get();

      if (!configSnapshot.exists) {
        return null;
      }

      const configData = configSnapshot.data() ?? {};

      if (!isPublicActiveWorld(configData)) {
        return null;
      }

      const world: BitGalaxyWorld = {
        orgId,
        name: resolveWorldName(
          orgId,
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
        theme:
          toNullableString(configData.theme) ??
          "neon",
        guestModeEnabled:
          configData.allowGuestMode === true,
        publicJoinEnabled:
          configData.allowPublicJoin === true,
        createdAt: resolveCreatedAt(
          orgData,
          configData,
        ),
        updatedAt: resolveUpdatedAt(
          orgData,
          configData,
        ),
      };

      return world;
    }),
  );

  return worldResults
    .filter(
      (world): world is BitGalaxyWorld =>
        world !== null,
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      }),
    );
}