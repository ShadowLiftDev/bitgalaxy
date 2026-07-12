import { adminDb } from "@/lib/firebase-admin";
import { getISOWeekKey } from "@/lib/weekKey";

import {
  getLevelForXP,
  getRankForXP,
} from "./rankEngine";

export interface PlayerInventoryItem {
  itemId: string;
  quantity: number;

  label?: string;
  description?: string;
  source?: string;

  createdAt?: FirebaseFirestore.Timestamp | null;
}

export interface NeonMemoryGameRecord {
  completed: boolean;

  weekKey: string | null;
  weeklyBestLevel: number | null;
  bestLevel: number | null;

  bestTimeMs: number | null;
  bestMoves: number | null;

  lastPlayedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

export interface GalaxyPaddleGameRecord {
  completed: boolean;

  weekKey: string | null;

  bestHits: number | null;
  bestTimeMs: number | null;
  bestMaxSpeed: number | null;

  lastPlayedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

export interface LunchboxRunGameRecord {
  completed: boolean;

  weekKey: string | null;

  bestScore: number | null;
  bestTimeMs: number | null;
  bestJumps: number | null;

  lastPlayedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

export interface NebulaBreakGameRecord {
  completed: boolean;

  weekKey: string | null;

  bestScore: number | null;
  bestBricks: number | null;
  bestTimeMs: number | null;

  lastPlayedAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

export interface BitGalaxySpecialEvents {
  neonMemory: NeonMemoryGameRecord;
  galaxyPaddle: GalaxyPaddleGameRecord;
  lunchboxRun: LunchboxRunGameRecord;
  nebulaBreak: NebulaBreakGameRecord;
}

export interface BitGalaxyPlayer {
  memberId: string;
  orgId: string;

  displayName: string;
  email: string | null;
  phone: string | null;

  totalXP: number;
  rank: string;
  level: number;

  weeklyXP: number;
  weeklyWeekKey: string;

  currentProgramId: string | null;

  activeQuestIds: string[];
  completedQuestIds: string[];

  questCompletionCounts: Record<string, number>;

  inventory: PlayerInventoryItem[];

  /**
   * Temporary compatibility layer for the existing BitGalaxy
   * games dashboard.
   *
   * Canonical game records live at:
   * members/{memberId}/orgLinks/{orgId}/modules/bitgalaxy/games/{gameId}
   *
   * This can later be renamed to `gameRecords` once every page
   * has been migrated.
   */
  specialEvents: BitGalaxySpecialEvents;

  lastCheckinAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

const BITGALAXY_MODULE_ID = "bitgalaxy";

/**
 * Canonical IDs shared by:
 *
 * - org quest definitions
 * - game routes
 * - member game records
 * - games dashboard
 */
const GAME_IDS = {
  neonMemory: "neon-memory",
  galaxyPaddle: "galaxy-paddle",
  lunchboxRun: "lunchbox-run",
  nebulaBreak: "nebula-break",
} as const;

function toFiniteNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function toNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const parsed = toFiniteNumber(
    value,
    fallback,
  );

  if (parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toNullableNonNegativeInteger(
  value: unknown,
): number | null {
  const parsed = toNullableNumber(value);

  if (parsed === null || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function toNullablePositiveInteger(
  value: unknown,
): number | null {
  const parsed = toNullableNumber(value);

  if (parsed === null || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function toNullableString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function toStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function toTimestampOrNull(
  value: unknown,
): FirebaseFirestore.Timestamp | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const candidate =
    value as FirebaseFirestore.Timestamp;

  if (
    typeof candidate.toDate ===
      "function" &&
    typeof candidate.toMillis ===
      "function"
  ) {
    return candidate;
  }

  return null;
}

function toDocumentData(
  value: unknown,
): FirebaseFirestore.DocumentData {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as FirebaseFirestore.DocumentData;
}

function normalizeCompletionCounts(
  value: unknown,
): Record<string, number> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const normalized: Record<string, number> =
    {};

  for (const [rawKey, rawCount] of Object.entries(
    value,
  )) {
    const key = rawKey.trim();

    if (!key) {
      continue;
    }

    normalized[key] =
      toNonNegativeInteger(rawCount, 0);
  }

  return normalized;
}

function normalizeInventory(
  value: unknown,
): PlayerInventoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item,
      ): PlayerInventoryItem | null => {
        if (
          !item ||
          typeof item !== "object" ||
          Array.isArray(item)
        ) {
          return null;
        }

        const raw =
          item as Record<string, unknown>;

        const itemId =
          toNullableString(raw.itemId);

        if (!itemId) {
          return null;
        }

        return {
          itemId,
          quantity:
            toNonNegativeInteger(
              raw.quantity,
              0,
            ),

          label:
            toNullableString(raw.label) ??
            undefined,

          description:
            toNullableString(
              raw.description,
            ) ?? undefined,

          source:
            toNullableString(raw.source) ??
            undefined,

          createdAt:
            toTimestampOrNull(
              raw.createdAt,
            ),
        };
      },
    )
    .filter(
      (
        item,
      ): item is PlayerInventoryItem =>
        item !== null,
    );
}

function normalizeDisplayName(
  memberId: string,
  data: FirebaseFirestore.DocumentData,
): string {
  const firstName =
    toNullableString(data.firstName);

  const lastName =
    toNullableString(data.lastName);

  const combinedName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const candidates = [
    data.displayName,
    data.name,
    data.fullName,
    combinedName || null,
  ];

  for (const candidate of candidates) {
    const normalized =
      toNullableString(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return `Player ${memberId.slice(0, 6)}`;
}

function resolveEmail(
  memberData: FirebaseFirestore.DocumentData,
): string | null {
  return toNullableString(
    memberData.email ??
      memberData.emailNormalized,
  );
}

function resolvePhone(
  memberData: FirebaseFirestore.DocumentData,
): string | null {
  return toNullableString(
    memberData.phoneE164 ??
      memberData.phone ??
      memberData.phoneNormalized ??
      memberData.phoneDigits,
  );
}

function emptyNeonMemoryRecord(): NeonMemoryGameRecord {
  return {
    completed: false,

    weekKey: null,
    weeklyBestLevel: null,
    bestLevel: null,

    bestTimeMs: null,
    bestMoves: null,

    lastPlayedAt: null,
    updatedAt: null,
  };
}

function emptyGalaxyPaddleRecord(): GalaxyPaddleGameRecord {
  return {
    completed: false,

    weekKey: null,

    bestHits: null,
    bestTimeMs: null,
    bestMaxSpeed: null,

    lastPlayedAt: null,
    updatedAt: null,
  };
}

function emptyLunchboxRunRecord(): LunchboxRunGameRecord {
  return {
    completed: false,

    weekKey: null,

    bestScore: null,
    bestTimeMs: null,
    bestJumps: null,

    lastPlayedAt: null,
    updatedAt: null,
  };
}

function emptyNebulaBreakRecord(): NebulaBreakGameRecord {
  return {
    completed: false,

    weekKey: null,

    bestScore: null,
    bestBricks: null,
    bestTimeMs: null,

    lastPlayedAt: null,
    updatedAt: null,
  };
}

function resolveLastPlayedAt(
  data: FirebaseFirestore.DocumentData,
): FirebaseFirestore.Timestamp | null {
  const lastResult =
    toDocumentData(data.lastResult);

  return toTimestampOrNull(
    data.lastPlayedAt ??
      lastResult.completedAt ??
      data.completedAt ??
      data.updatedAt,
  );
}

function normalizeNeonMemoryRecord(
  data?: FirebaseFirestore.DocumentData,
): NeonMemoryGameRecord {
  if (!data) {
    return emptyNeonMemoryRecord();
  }

  const weekKey = toNullableString(
    data.weeklyWeekKey ??
      data.weekKey,
  );

  const weeklyBestLevel =
    toNullableNonNegativeInteger(
      data.weeklyBestLevel,
    );

  const bestLevel =
    toNullableNonNegativeInteger(
      data.bestLevel,
    );

  const bestMoves =
    toNullablePositiveInteger(
      data.bestMoves,
    );

  const bestTimeMs =
    toNullablePositiveInteger(
      data.bestTimeMs,
    );

  const hasRecordedProgress =
    weekKey !== null ||
    weeklyBestLevel !== null ||
    bestLevel !== null ||
    bestMoves !== null ||
    bestTimeMs !== null;

  return {
    completed:
      data.completed === true ||
      hasRecordedProgress,

    weekKey,
    weeklyBestLevel,
    bestLevel,

    bestTimeMs,
    bestMoves,

    lastPlayedAt:
      resolveLastPlayedAt(data),

    updatedAt:
      toTimestampOrNull(
        data.updatedAt,
      ),
  };
}

function normalizeGalaxyPaddleRecord(
  data?: FirebaseFirestore.DocumentData,
): GalaxyPaddleGameRecord {
  if (!data) {
    return emptyGalaxyPaddleRecord();
  }

  const weekKey = toNullableString(
    data.weeklyWeekKey ??
      data.weekKey,
  );

  const bestHits =
    toNullableNonNegativeInteger(
      data.bestHits,
    );

  const bestTimeMs =
    toNullablePositiveInteger(
      data.bestTimeMs,
    );

  const bestMaxSpeed =
    toNullableNumber(
      data.bestMaxSpeed,
    );

  const hasRecordedProgress =
    weekKey !== null ||
    bestHits !== null ||
    bestTimeMs !== null ||
    bestMaxSpeed !== null;

  return {
    completed:
      data.completed === true ||
      hasRecordedProgress,

    weekKey,

    bestHits,
    bestTimeMs,
    bestMaxSpeed,

    lastPlayedAt:
      resolveLastPlayedAt(data),

    updatedAt:
      toTimestampOrNull(
        data.updatedAt,
      ),
  };
}

function normalizeLunchboxRunRecord(
  data?: FirebaseFirestore.DocumentData,
): LunchboxRunGameRecord {
  if (!data) {
    return emptyLunchboxRunRecord();
  }

  const weekKey = toNullableString(
    data.weeklyWeekKey ??
      data.weekKey,
  );

  const bestScore =
    toNullableNonNegativeInteger(
      data.bestScore,
    );

  const bestTimeMs =
    toNullablePositiveInteger(
      data.bestTimeMs,
    );

  const bestJumps =
    toNullableNonNegativeInteger(
      data.bestJumps,
    );

  const hasRecordedProgress =
    weekKey !== null ||
    bestScore !== null ||
    bestTimeMs !== null ||
    bestJumps !== null;

  return {
    completed:
      data.completed === true ||
      hasRecordedProgress,

    weekKey,

    bestScore,
    bestTimeMs,
    bestJumps,

    lastPlayedAt:
      resolveLastPlayedAt(data),

    updatedAt:
      toTimestampOrNull(
        data.updatedAt,
      ),
  };
}

function normalizeNebulaBreakRecord(
  data?: FirebaseFirestore.DocumentData,
): NebulaBreakGameRecord {
  if (!data) {
    return emptyNebulaBreakRecord();
  }

  const weekKey = toNullableString(
    data.weeklyWeekKey ??
      data.weekKey,
  );

  const bestScore =
    toNullableNonNegativeInteger(
      data.bestScore,
    );

  const bestBricks =
    toNullableNonNegativeInteger(
      data.bestBricks,
    );

  const bestTimeMs =
    toNullablePositiveInteger(
      data.bestTimeMs,
    );

  const hasRecordedProgress =
    weekKey !== null ||
    bestScore !== null ||
    bestBricks !== null ||
    bestTimeMs !== null;

  return {
    completed:
      data.completed === true ||
      hasRecordedProgress,

    weekKey,

    bestScore,
    bestBricks,
    bestTimeMs,

    lastPlayedAt:
      resolveLastPlayedAt(data),

    updatedAt:
      toTimestampOrNull(
        data.updatedAt,
      ),
  };
}

function buildZeroState(
  memberId: string,
  orgId: string,
  memberData: FirebaseFirestore.DocumentData,
  specialEvents: BitGalaxySpecialEvents,
): BitGalaxyPlayer {
  const totalXP = 0;
  const currentWeekKey =
    getISOWeekKey(new Date());

  return {
    memberId,
    orgId,

    displayName:
      normalizeDisplayName(
        memberId,
        memberData,
      ),

    email: resolveEmail(memberData),
    phone: resolvePhone(memberData),

    totalXP,
    rank: getRankForXP(totalXP),
    level: getLevelForXP(totalXP),

    weeklyXP: 0,
    weeklyWeekKey:
      currentWeekKey,

    currentProgramId: null,

    activeQuestIds: [],
    completedQuestIds: [],
    questCompletionCounts: {},

    inventory: [],

    specialEvents,

    lastCheckinAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

function normalizePlayerState(
  memberId: string,
  orgId: string,
  memberData: FirebaseFirestore.DocumentData,
  stateData: FirebaseFirestore.DocumentData,
  specialEvents: BitGalaxySpecialEvents,
): BitGalaxyPlayer {
  const totalXP =
    toNonNegativeInteger(
      stateData.totalXP ??
        stateData.totalXp ??
        stateData.xp ??
        stateData.xpTotal,
      0,
    );

  const calculatedRank =
    getRankForXP(totalXP);

  const storedRank =
    toNullableString(stateData.rank);

  const calculatedLevel =
    getLevelForXP(totalXP);

  const storedLevel =
    toNullableNonNegativeInteger(
      stateData.level,
    );

  const currentWeekKey =
    getISOWeekKey(new Date());

  const storedWeekKey =
    toNullableString(
      stateData.weeklyWeekKey,
    );

  const weeklyXP =
    storedWeekKey === currentWeekKey
      ? toNonNegativeInteger(
          stateData.weeklyXP ??
            stateData.weeklyXp,
          0,
        )
      : 0;

  return {
    memberId,
    orgId,

    displayName:
      normalizeDisplayName(
        memberId,
        memberData,
      ),

    email: resolveEmail(memberData),
    phone: resolvePhone(memberData),

    totalXP,

    rank:
      storedRank ??
      calculatedRank,

    level:
      storedLevel !== null
        ? Math.max(
            1,
            storedLevel,
          )
        : calculatedLevel,

    weeklyXP,

    /*
     * This is normalized in memory to the current week.
     * getPlayer remains read-only and does not modify Firestore.
     */
    weeklyWeekKey:
      currentWeekKey,

    currentProgramId:
      toNullableString(
        stateData.currentProgramId ??
          stateData.defaultProgramId,
      ),

    activeQuestIds:
      toStringArray(
        stateData.activeQuestIds,
      ),

    completedQuestIds:
      toStringArray(
        stateData.completedQuestIds,
      ),

    questCompletionCounts:
      normalizeCompletionCounts(
        stateData.questCompletionCounts,
      ),

    inventory:
      normalizeInventory(
        stateData.inventory,
      ),

    specialEvents,

    lastCheckinAt:
      toTimestampOrNull(
        stateData.lastCheckinAt ??
          stateData.lastCheckInAt,
      ),

    createdAt:
      toTimestampOrNull(
        stateData.createdAt,
      ),

    updatedAt:
      toTimestampOrNull(
        stateData.updatedAt,
      ),
  };
}

/**
 * Loads one OwnerOptics member's BitGalaxy state for one
 * organization.
 *
 * Canonical identity:
 * members/{memberId}
 *
 * Organization relationship:
 * members/{memberId}/orgLinks/{orgId}
 *
 * BitGalaxy live state:
 * members/{memberId}/orgLinks/{orgId}/modules/bitgalaxy/state/current
 *
 * BitGalaxy game records:
 * members/{memberId}/orgLinks/{orgId}/modules/bitgalaxy/games/{gameId}
 *
 * This helper is intentionally read-only.
 *
 * It does not create:
 * - member records
 * - org links
 * - BitGalaxy state
 * - game records
 *
 * If either the member or organization relationship does not
 * exist, it returns null.
 *
 * If the member and organization relationship exist but
 * BitGalaxy state does not yet exist, it returns an in-memory
 * zero-state player.
 */
export async function getPlayer(
  orgId: string,
  memberId: string,
): Promise<BitGalaxyPlayer | null> {
  const normalizedOrgId =
    orgId.trim();

  const normalizedMemberId =
    memberId.trim();

  if (!normalizedOrgId) {
    throw new Error(
      "getPlayer: orgId is required",
    );
  }

  if (!normalizedMemberId) {
    throw new Error(
      "getPlayer: memberId is required",
    );
  }

  const memberRef = adminDb
    .collection("members")
    .doc(normalizedMemberId);

  const orgLinkRef = memberRef
    .collection("orgLinks")
    .doc(normalizedOrgId);

  const bitGalaxyModuleRef =
    orgLinkRef
      .collection("modules")
      .doc(BITGALAXY_MODULE_ID);

  const stateRef =
    bitGalaxyModuleRef
      .collection("state")
      .doc("current");

  const gamesRef =
    bitGalaxyModuleRef.collection(
      "games",
    );

  const [
    memberSnapshot,
    orgLinkSnapshot,
    stateSnapshot,
    neonMemorySnapshot,
    galaxyPaddleSnapshot,
    lunchboxRunSnapshot,
    nebulaBreakSnapshot,
  ] = await Promise.all([
    memberRef.get(),
    orgLinkRef.get(),
    stateRef.get(),

    gamesRef
      .doc(GAME_IDS.neonMemory)
      .get(),

    gamesRef
      .doc(GAME_IDS.galaxyPaddle)
      .get(),

    gamesRef
      .doc(GAME_IDS.lunchboxRun)
      .get(),

    gamesRef
      .doc(GAME_IDS.nebulaBreak)
      .get(),
  ]);

  if (!memberSnapshot.exists) {
    return null;
  }

  if (!orgLinkSnapshot.exists) {
    return null;
  }

  const memberData =
    memberSnapshot.data() ?? {};

  const specialEvents: BitGalaxySpecialEvents =
    {
      neonMemory:
        normalizeNeonMemoryRecord(
          neonMemorySnapshot.exists
            ? neonMemorySnapshot.data()
            : undefined,
        ),

      galaxyPaddle:
        normalizeGalaxyPaddleRecord(
          galaxyPaddleSnapshot.exists
            ? galaxyPaddleSnapshot.data()
            : undefined,
        ),

      lunchboxRun:
        normalizeLunchboxRunRecord(
          lunchboxRunSnapshot.exists
            ? lunchboxRunSnapshot.data()
            : undefined,
        ),

      nebulaBreak:
        normalizeNebulaBreakRecord(
          nebulaBreakSnapshot.exists
            ? nebulaBreakSnapshot.data()
            : undefined,
        ),
    };

  if (!stateSnapshot.exists) {
    return buildZeroState(
      normalizedMemberId,
      normalizedOrgId,
      memberData,
      specialEvents,
    );
  }

  return normalizePlayerState(
    normalizedMemberId,
    normalizedOrgId,
    memberData,
    stateSnapshot.data() ?? {},
    specialEvents,
  );
}