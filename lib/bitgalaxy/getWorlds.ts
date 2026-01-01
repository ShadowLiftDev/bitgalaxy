import { adminDb } from "@/lib/firebase-admin";

export interface BitGalaxyWorld {
  orgId: string;
  name: string;
  createdAt?: FirebaseFirestore.Timestamp;
  // later: avatar, location, tags, etc.
}

export async function getWorlds(): Promise<BitGalaxyWorld[]> {
  const snap = await adminDb.collection("orgs").get();

  const worlds: BitGalaxyWorld[] = [];

  snap.forEach((doc) => {
    const data = doc.data() as any;
    const appsEnabled = data.appsEnabled || {};
    if (appsEnabled.BitGalaxy || appsEnabled.bitGalaxy) {
      worlds.push({
        orgId: doc.id,
        name: data.name ?? doc.id,
        createdAt: data.createdAt,
      });
    }
  });

  // Simple alphabetic sort by name
  worlds.sort((a, b) => a.name.localeCompare(b.name));

  return worlds;
}