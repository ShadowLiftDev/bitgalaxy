import { adminDb } from "@/lib/firebase-admin";
import type { BitGalaxyProgram } from "./getPrograms";

export async function getProgram(
  orgId: string,
  programId: string,
): Promise<BitGalaxyProgram | null> {
  if (!orgId) throw new Error("getProgram: orgId is required");
  if (!programId) throw new Error("getProgram: programId is required");

  const ref = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPrograms")
    .doc(programId);

  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as Omit<BitGalaxyProgram, "id">;
  return { id: snap.id, ...data };
}
