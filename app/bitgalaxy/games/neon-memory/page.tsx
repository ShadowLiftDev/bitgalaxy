import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { NeonMemoryGame } from "@/components/bitgalaxy/NeonMemoryGame";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

type NeonMemoryPageProps = {
  searchParams?: { userId?: string };
};

function getDevUserId() {
  const devUid = process.env.NEXT_PUBLIC_DEV_UID;
  if (!devUid) {
    throw new Error(
      "BitGalaxy Neon Memory: set NEXT_PUBLIC_DEV_UID in .env.local to a test Firebase UID (or wire actual auth).",
    );
  }
  return devUid;
}

export const metadata = {
  title: "BitGalaxy – Neon Memory Tutorial",
};

export default async function NeonMemoryPage({
  searchParams,
}: NeonMemoryPageProps) {
  const orgId = DEFAULT_ORG_ID;

  const queryUserId = searchParams?.userId || null;
  const devUserId =
    !queryUserId && process.env.NODE_ENV !== "production"
      ? getDevUserId()
      : null;
  const userId = queryUserId || devUserId;

  if (!userId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />
        <section className="mt-2">
          <PlayerLookupGate orgId={orgId} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />
      <section>
        <NeonMemoryGame orgId={orgId} userId={userId} />
      </section>
    </div>
  );
}