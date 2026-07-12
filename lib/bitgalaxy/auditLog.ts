import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

export type BitGalaxyAuditEventType =
  | "xp"
  | "quest_start"
  | "quest_complete"
  | "arcade_run"
  | "arcade_complete"
  | "arcade_tier_complete"
  | "checkin";

export interface BitGalaxyAuditLogEntry {
  activityId: string;

  system: "bitgalaxy";
  moduleId: "bitgalaxy";

  orgId: string;
  memberId: string;

  eventType: BitGalaxyAuditEventType;
  xpChange: number | null;

  questId: string | null;
  rewardId: string | null;
  gameId: string | null;

  source: string | null;
  meta: Record<string, unknown> | null;

  occurredAt: FirebaseFirestore.FieldValue;
  createdAt: FirebaseFirestore.FieldValue;
}

export interface WriteAuditLogInput {
  eventType: BitGalaxyAuditEventType;

  xpChange?: number | null;

  questId?: string | null;
  rewardId?: string | null;
  gameId?: string | null;

  source?: string | null;
  meta?: Record<string, unknown>;
}

function normalizeRequiredId(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `writeAuditLog: ${fieldName} is required`,
    );
  }

  return normalized;
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

function cleanMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!meta) {
    return null;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length
    ? cleaned
    : null;
}

export async function writeAuditLog(
  orgId: string,
  memberId: string,
  input: WriteAuditLogInput,
): Promise<void> {
  const normalizedOrgId = normalizeRequiredId(
    orgId,
    "orgId",
  );

  const normalizedMemberId = normalizeRequiredId(
    memberId,
    "memberId",
  );

  if (!input?.eventType) {
    throw new Error(
      "writeAuditLog: eventType is required",
    );
  }

  if (
    input.xpChange !== undefined &&
    input.xpChange !== null &&
    !Number.isFinite(input.xpChange)
  ) {
    throw new Error(
      "writeAuditLog: xpChange must be a finite number or null",
    );
  }

  const activityRef = adminDb
    .collection("activities")
    .doc();

  const now = FieldValue.serverTimestamp();

  const entry: BitGalaxyAuditLogEntry = {
    activityId: activityRef.id,

    system: "bitgalaxy",
    moduleId: "bitgalaxy",

    orgId: normalizedOrgId,
    memberId: normalizedMemberId,

    eventType: input.eventType,
    xpChange:
      typeof input.xpChange === "number"
        ? input.xpChange
        : null,

    questId: normalizeOptionalString(
      input.questId,
    ),
    rewardId: normalizeOptionalString(
      input.rewardId,
    ),
    gameId: normalizeOptionalString(
      input.gameId,
    ),

    source: normalizeOptionalString(
      input.source,
    ),
    meta: cleanMeta(input.meta),

    occurredAt: now,
    createdAt: now,
  };

  await activityRef.set(entry);
}