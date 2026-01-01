import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type AuditEventType =
  | "xp"
  | "quest_start"
  | "quest_complete"
  | "arcade_tier_complete" 
  | "checkin"
  | "reward_redeem"
  | "referral";

export interface AuditLogEntry {
  eventType: AuditEventType;
  xpChange: number | null;
  questId: string | null;
  rewardId: string | null;
  source: string | null;
  meta: Record<string, any> | null;
  timestamp: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
}

interface WriteAuditLogInput {
  eventType: AuditEventType;
  xpChange?: number;
  questId?: string | null;
  rewardId?: string | null;
  source?: string;
  meta?: Record<string, any>;
}

export async function writeAuditLog(
  orgId: string,
  userId: string,
  input: WriteAuditLogInput,
): Promise<void> {
  if (!orgId) throw new Error("writeAuditLog: orgId is required");
  if (!userId) throw new Error("writeAuditLog: userId is required");

  const now = FieldValue.serverTimestamp();

  const historyRef = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .doc(userId)
    .collection("history")
    .doc();

  const cleanedMeta: Record<string, any> = {};
  if (input.meta) {
    for (const [key, value] of Object.entries(input.meta)) {
      if (value !== undefined) cleanedMeta[key] = value;
    }
  }

  const entry: AuditLogEntry = {
    eventType: input.eventType,
    xpChange: input.xpChange ?? null,
    questId: input.questId ?? null,
    rewardId: input.rewardId ?? null,
    source: input.source ?? null,
    meta: Object.keys(cleanedMeta).length ? cleanedMeta : null,
    timestamp: now,
  };

  await historyRef.set(entry);
}