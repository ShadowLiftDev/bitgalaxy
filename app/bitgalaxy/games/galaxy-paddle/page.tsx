import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { GalaxyPaddleGame } from "@/components/bitgalaxy/GalaxyPaddleGame";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

type ResolvedSearchParams = {
  orgId?: string;
  userId?: string;
  guest?: string;
};

type GalaxyPaddlePageProps = {
  /**
   * We’re mirroring the pattern used on the BitGalaxy home page,
   * where `searchParams` is treated as a Promise for type compatibility.
   */
  searchParams?: Promise<ResolvedSearchParams>;
};

export const metadata = {
  title: "BitGalaxy – Galaxy Paddle",
};

export default async function GalaxyPaddlePage({
  searchParams,
}: GalaxyPaddlePageProps) {
  const resolved: ResolvedSearchParams = searchParams
    ? await searchParams
    : {};

  const orgId = (resolved.orgId ?? DEFAULT_ORG_ID).trim();

  // guest=1 → explicit guest mode (no XP, no userId required)
  const isGuest = resolved.guest === "1";

  // For non-guest players, we require a userId just like the main BitGalaxy dashboard.
  const userId = !isGuest && resolved.userId ? resolved.userId : null;

  // If not in guest mode and we don’t have a userId yet, send the player
  // through the PlayerLookupGate to resolve phone/email → player profile.
  if (!isGuest && !userId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />

        <section className="mt-2">
          <PlayerLookupGate
            orgId={orgId}
            // After lookup, this should redirect back here with
            // ?orgId=...&userId=... so we can load the game as a signed-in player.
            redirectBase="/bitgalaxy/games/galaxy-paddle"
          />
        </section>
      </div>
    );
  }

  // Either:
  // - guest mode (guest=1, userId null), OR
  // - signed-in player (userId present, not guest)
  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <section>
        <GalaxyPaddleGame
          orgId={orgId}
          userId={userId}      // null for guests, string for signed-in players
          isGuest={isGuest}
        />
      </section>
    </div>
  );
}