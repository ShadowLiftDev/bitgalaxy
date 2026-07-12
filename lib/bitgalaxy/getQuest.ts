import { adminDb } from "@/lib/firebase-admin";
import type { BitGalaxyQuest, QuestType } from "./getQuests";

const BITGALAXY_MODULE_ID = "bitgalaxy";

const QUEST_TYPES: QuestType[] = [
  "checkin",
  "purchase",
  "photo",
  "referral",
  "visit",
  "custom",
  "arcade",
];

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullablePositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function toTimestampOrNull(
  value: unknown,
): FirebaseFirestore.Timestamp | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as FirebaseFirestore.Timestamp;

  if (
    typeof candidate.toDate === "function" &&
    typeof candidate.toMillis === "function"
  ) {
    return candidate;
  }

  return null;
}

function normalizeQuestType(value: unknown): QuestType {
  if (
    typeof value === "string" &&
    QUEST_TYPES.includes(value as QuestType)
  ) {
    return value as QuestType;
  }

  return "custom";
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeQuest(
  orgId: string,
  id: string,
  data: FirebaseFirestore.DocumentData,
): BitGalaxyQuest {
  return {
    id,
    orgId,
    programId: toNullableString(data.programId),
    title: toNullableString(data.title) ?? "Untitled Quest",
    description: toNullableString(data.description) ?? "",
    type: normalizeQuestType(data.type),
    xp: Math.max(0, toNumber(data.xp, 0)),
    isActive: data.isActive !== false,
    maxCompletionsPerUser: toNullablePositiveInteger(
      data.maxCompletionsPerUser,
    ),
    checkinCode: toNullableString(data.checkinCode),
    requiresStaffApproval: Boolean(data.requiresStaffApproval),
    metadata: normalizeMetadata(data.metadata),
    createdAt: toTimestampOrNull(data.createdAt),
    updatedAt: toTimestampOrNull(data.updatedAt),
  };
}

export async function getQuest(
  orgId: string,
  questId: string,
): Promise<BitGalaxyQuest | null> {
  const normalizedOrgId = orgId.trim();
  const normalizedQuestId = questId.trim();

  if (!normalizedOrgId) {
    throw new Error("getQuest: orgId is required");
  }

  if (!normalizedQuestId) {
    throw new Error("getQuest: questId is required");
  }

  const questRef = adminDb
    .collection("orgs")
    .doc(normalizedOrgId)
    .collection("modules")
    .doc(BITGALAXY_MODULE_ID)
    .collection("quests")
    .doc(normalizedQuestId);

  const snapshot = await questRef.get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeQuest(
    normalizedOrgId,
    snapshot.id,
    snapshot.data() ?? {},
  );
}