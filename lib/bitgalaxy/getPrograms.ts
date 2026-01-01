import { adminDb } from "@/lib/firebase-admin";

export interface BitGalaxyProgram {
  id: string;
  name: string;
  description: string;
  startAt: FirebaseFirestore.Timestamp;
  endAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
  xpMultiplier: number;
  questIds: string[];
  displayOrder: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface GetProgramsOptions {
  activeOnly?: boolean;
}

export async function getPrograms(
  orgId: string,
  options: GetProgramsOptions = {},
): Promise<BitGalaxyProgram[]> {
  if (!orgId) throw new Error("getPrograms: orgId is required");

  let query: FirebaseFirestore.Query = adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPrograms");

  if (options.activeOnly !== false) {
    query = query.where("isActive", "==", true);
  }

  const snap = await query.get();

  const programs: BitGalaxyProgram[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as Omit<BitGalaxyProgram, "id">;
    programs.push({ id: doc.id, ...data });
  });

  // Sort by displayOrder, then startAt
  programs.sort((a, b) => {
    const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const aStart = a.startAt?.toMillis?.() ?? 0;
    const bStart = b.startAt?.toMillis?.() ?? 0;
    return aStart - bStart;
  });

  return programs;
}