import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface OrgPlayerShard {
  orgId: string;
  totalXP: number;
  rank: string;
  updatedAt?: Timestamp | null;
}

export interface GlobalPlayerAggregate {
  userId: string;
  totalXP: number;
  perOrg: OrgPlayerShard[];
  lastSyncedAt: Timestamp | null;
}

/**
 * Aggregates a player's BitGalaxy progress across all orgs that have BitGalaxy enabled,
 * and writes a consolidated snapshot to /bitgalaxyGlobalPlayers/{userId}.
 *
 * Useful for ProfileMatrix, NeonMatrix, and any "global" BitGalaxy views.
 */
export async function syncPlayerAcrossOrgs(
  userId: string,
): Promise<GlobalPlayerAggregate | null> {
  if (!userId) throw new Error("syncPlayerAcrossOrgs: userId is required");

  // 1) Find all orgs that have BitGalaxy enabled
  const orgsSnap = await adminDb.collection("orgs").get();

  const shards: OrgPlayerShard[] = [];

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data() as any;
    const appsEnabled = orgData.appsEnabled || {};

    const hasBitGalaxy = appsEnabled.BitGalaxy || appsEnabled.bitGalaxy;
    if (!hasBitGalaxy) continue;

    const orgId = orgDoc.id;

    // 2) Look up this user in the org's bitgalaxyPlayers
    const playerRef = orgDoc.ref.collection("bitgalaxyPlayers").doc(userId);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) continue;

    const data = playerSnap.data() as any;

    shards.push({
      orgId,
      totalXP: Number(data.totalXP || 0),
      rank: data.rank ?? "Underdog",
      updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
    });
  }

  if (!shards.length) {
    // No BitGalaxy presence anywhere; nothing to sync
    return null;
  }

  // 3) Aggregate totals
  const totalXP = shards.reduce((sum, shard) => sum + shard.totalXP, 0);

  const now = FieldValue.serverTimestamp() as Timestamp;

  const aggregate: GlobalPlayerAggregate = {
    userId,
    totalXP,
    perOrg: shards,
    lastSyncedAt: now,
  };

  // 4) Write to global snapshot collection
  const globalRef = adminDb.collection("bitgalaxyGlobalPlayers").doc(userId);
  await globalRef.set(aggregate, { merge: true });

  return aggregate;
}