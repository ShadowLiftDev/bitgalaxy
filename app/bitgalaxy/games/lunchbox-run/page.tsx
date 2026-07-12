import Link from "next/link";

import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { LunchboxRunGame } from "@/components/bitgalaxy/LunchboxRunGame";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import { getWorld } from "@/lib/bitgalaxy/getWorld";

type ResolvedSearchParams = {
  orgId?: string;
  memberId?: string;
  guest?: string;
};

type LunchboxRunPageProps = {
  searchParams?: Promise<ResolvedSearchParams>;
};

export const metadata = {
  title: "BitGalaxy · Lunchbox Run",
};

const GAME_ID = "lunchbox-run";

export default async function LunchboxRunPage({
  searchParams,
}: LunchboxRunPageProps) {
  const resolved = searchParams
    ? await searchParams
    : {};

  const orgId = resolved.orgId?.trim() || null;

  const isGuest = resolved.guest === "1";

  const memberId =
    !isGuest &&
    resolved.memberId?.trim()
      ? resolved.memberId.trim()
      : null;

  if (!orgId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName="BitGalaxy" />

        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
          <h1 className="text-base font-semibold text-amber-50">
            Choose a BitGalaxy world first
          </h1>

          <p className="mt-2 text-[11px] text-amber-200/85">
            Lunchbox Run must be launched from an active
            organization’s arcade.
          </p>

          <Link
            href="/bitgalaxy/games"
            className="mt-4 inline-flex rounded-full bg-amber-400 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
          >
            Return to world selection
          </Link>
        </section>
      </div>
    );
  }

  const [world, quest] = await Promise.all([
    getWorld(orgId),
    getQuest(orgId, GAME_ID),
  ]);

  const worldIsAvailable =
    world !== null &&
    world.status === "active" &&
    world.allowPublicAccess === true;

  const gameIsAvailable =
    quest !== null &&
    quest.isActive === true &&
    quest.type === "arcade";

  if (
    !worldIsAvailable ||
    !gameIsAvailable
  ) {
    return (
      <div className="space-y-6">
        <GalaxyHeader
          orgName={world?.name ?? "BitGalaxy"}
        />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            Lunchbox Run is unavailable
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            This organization does not currently have an
            active, public Lunchbox Run arcade mission.
          </p>

          <Link
            href={`/bitgalaxy/games?orgId=${encodeURIComponent(
              orgId,
            )}`}
            className="mt-4 inline-flex rounded-full bg-rose-300 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-rose-200"
          >
            Back to BitGalaxy
          </Link>
        </section>
      </div>
    );
  }

  if (
    isGuest &&
    world.guestModeEnabled !== true
  ) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
          <h1 className="text-base font-semibold text-amber-50">
            Guest access is unavailable
          </h1>

          <p className="mt-2 text-[11px] text-amber-200/85">
            Connect an OwnerOptics member profile to play
            Lunchbox Run in this world.
          </p>
        </section>

        <PlayerLookupGate
          orgId={orgId}
          redirectBase="/bitgalaxy/games/lunchbox-run"
        />
      </div>
    );
  }

  if (!isGuest && !memberId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="mt-2">
          <PlayerLookupGate
            orgId={orgId}
            redirectBase="/bitgalaxy/games/lunchbox-run"
          />
        </section>
      </div>
    );
  }

  const player =
    !isGuest && memberId
      ? await getPlayer(
          orgId,
          memberId,
        )
      : null;

  if (!isGuest && !player) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            Member progress could not be loaded
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            Locate your member profile again before
            launching Lunchbox Run.
          </p>
        </section>

        <PlayerLookupGate
          orgId={orgId}
          redirectBase="/bitgalaxy/games/lunchbox-run"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={world.name} />

      <LunchboxRunGame
        orgId={orgId}
        worldName={world.name}
        memberId={memberId}
        memberName={
          player?.displayName ?? null
        }
        isGuest={isGuest}
      />
    </div>
  );
}