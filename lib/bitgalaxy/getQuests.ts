import { adminDb } from "@/lib/firebase-admin";

export type QuestType =
  | "checkin"
  | "purchase"
  | "photo"
  | "referral"
  | "visit"
  | "custom"
  | "arcade";

export interface BitGalaxyQuest {
  id: string;
  orgId: string;
  programId: string | null;
  title: string;
  description: string;
  type: QuestType;
  xp: number;
  isActive: boolean;
  maxCompletionsPerUser: number | null;
  checkinCode: string | null;
  requiresStaffApproval: boolean;
  metadata: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

interface GetQuestsOptions {
  programId?: string;
  activeOnly?: boolean;
}

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

function getBitGalaxyQuestsCollection(orgId: string) {
  return adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("modules")
    .doc(BITGALAXY_MODULE_ID)
    .collection("quests");
}

export async function getQuests(
  orgId: string,
  options: GetQuestsOptions = {},
): Promise<BitGalaxyQuest[]> {
  const normalizedOrgId = orgId.trim();
  const normalizedProgramId = options.programId?.trim();

  if (!normalizedOrgId) {
    throw new Error("getQuests: orgId is required");
  }

  let query: FirebaseFirestore.Query =
    getBitGalaxyQuestsCollection(normalizedOrgId);

  if (normalizedProgramId) {
    query = query.where("programId", "==", normalizedProgramId);
  }

  if (options.activeOnly !== false) {
    query = query.where("isActive", "==", true);
  }

  const snapshot = await query.get();

  const quests = snapshot.docs.map((doc) =>
    normalizeQuest(normalizedOrgId, doc.id, doc.data()),
  );

  quests.sort((a, b) => {
    const aCreatedAt = a.createdAt?.toMillis() ?? 0;
    const bCreatedAt = b.createdAt?.toMillis() ?? 0;

    if (aCreatedAt !== bCreatedAt) {
      return aCreatedAt - bCreatedAt;
    }

    return a.title.localeCompare(b.title);
  });

  return quests;
}