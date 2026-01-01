import { adminDb } from "@/lib/firebase-admin";
import { getLevelForXP, getRankForXP } from "./rankEngine";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getISOWeekKey } from "@/lib/weekKey";

export interface PlayerInventoryItem {
  itemId: string;
  quantity: number;

  // Optional UI/meta fields (safe even if not present in Firestore yet)
  label?: string;
  description?: string;
  source?: string;
  createdAt?: Timestamp; // store as ms epoch (recommended)
};

export interface BitGalaxyPlayer {
  userId: string;
  orgId: string;

  totalXP: number;
  rank: string;

  level: number;
  weeklyXP: number;
  weeklyWeekKey: string;

  currentProgramId: string | null;
  activeQuestIds: string[];
  completedQuestIds: string[];
  inventory: PlayerInventoryItem[];
  lastCheckinAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

const PLAYERS_SUBCOLLECTION = "bitgalaxyPlayers";

export async function getPlayer(
  orgId: string,
  userId: string,
): Promise<BitGalaxyPlayer> {
  if (!orgId) throw new Error("getPlayer: orgId is required");
  if (!userId) throw new Error("getPlayer: userId is required");

  const playerRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection(PLAYERS_SUBCOLLECTION)
    .doc(userId);

  const snap = await playerRef.get();

  if (snap.exists) {
    const data = snap.data() as any;

    const totalXP = Number(data.totalXP || 0);
    const rank = data.rank ?? getRankForXP(totalXP);
    const level = Number.isFinite(data.level)
      ? Number(data.level)
      : getLevelForXP(totalXP);

    const currentWeekKey = getISOWeekKey(new Date());

    return {
      ...data,
      userId: data.userId ?? userId,
      orgId,
      totalXP,
      rank,
      level,
      weeklyXP: Number(data.weeklyXP || 0),
      // ✅ never empty string (helps weekly reset logic later)
      weeklyWeekKey: String(data.weeklyWeekKey || currentWeekKey),
    } as BitGalaxyPlayer;
  }

  // Create default player if missing (race-safe)
  return await adminDb.runTransaction(async (tx) => {
    const freshSnap = await tx.get(playerRef);
    if (freshSnap.exists) return freshSnap.data() as BitGalaxyPlayer;

    const now = FieldValue.serverTimestamp();
    const totalXP = 0;
    const rank = getRankForXP(totalXP);
    const level = getLevelForXP(totalXP);
    const weekKey = getISOWeekKey(new Date());

    const newPlayer: BitGalaxyPlayer = {
      userId,
      orgId,
      totalXP,
      rank,
      level,
      weeklyXP: 0,
      weeklyWeekKey: weekKey,
      currentProgramId: null,
      activeQuestIds: [],
      completedQuestIds: [],
      inventory: [],
      lastCheckinAt: null,
      createdAt: null,
      updatedAt: null,
    };

    tx.set(
      playerRef,
      { ...newPlayer, createdAt: now, updatedAt: now },
      { merge: true },
    );

    return newPlayer;
  });
}