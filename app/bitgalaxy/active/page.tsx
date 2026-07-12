import Link from "next/link";

import { ActiveQuestCard } from "@/components/bitgalaxy/ActiveQuestCard";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getWorld } from "@/lib/bitgalaxy/getWorld";

export const metadata = {
  title: "BitGalaxy · Active Quests",
};

type ResolvedSearchParams = {
  orgId?: string;
  memberId?: string;
};

type BitGalaxyActivePageProps = {
  searchParams?: Promise<ResolvedSearchParams>;
};

export default async function BitGalaxyActivePage({
  searchParams,
}: BitGalaxyActivePageProps) {
  const resolved = searchParams
    ? await searchParams
    : {};

  const orgId =
    resolved.orgId?.trim() || null;

  const memberId =
    resolved.memberId?.trim() || null;

  if (!orgId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName="BitGalaxy" />

        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
          <h1 className="text-base font-semibold text-amber-50">
            Choose a BitGalaxy world first
          </h1>

          <p className="mt-2 text-[11px] text-amber-200/85">
            Active quests must be viewed from a valid
            organization world.
          </p>

          <Link
            href="/bitgalaxy"
            className="mt-4 inline-flex rounded-full bg-amber-400 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-amber-300"
          >
            Return to BitGalaxy
          </Link>
        </section>
      </div>
    );
  }

  const world = await getWorld(orgId);

  const worldIsAvailable =
    world !== null &&
    world.status === "active" &&
    world.allowPublicAccess === true;

  if (!worldIsAvailable) {
    return (
      <div className="space-y-6">
        <GalaxyHeader
          orgName={
            world?.name ?? "BitGalaxy"
          }
        />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            BitGalaxy world unavailable
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            This organization does not currently have an
            active public BitGalaxy world.
          </p>

          <Link
            href="/bitgalaxy"
            className="mt-4 inline-flex rounded-full bg-rose-300 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-rose-200"
          >
            Return to BitGalaxy
          </Link>
        </section>
      </div>
    );
  }

  if (!memberId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="mt-2">
          <PlayerLookupGate
            orgId={orgId}
            redirectBase="/bitgalaxy/active"
          />
        </section>
      </div>
    );
  }

  const [player, activeQuests] =
    await Promise.all([
      getPlayer(
        orgId,
        memberId,
      ),

      getActiveQuests(
        orgId,
        memberId,
      ),
    ]);

  if (!player) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            Member progress could not be loaded
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            Locate your connected OwnerOptics member profile
            before viewing active quests.
          </p>
        </section>

        <PlayerLookupGate
          orgId={orgId}
          redirectBase="/bitgalaxy/active"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={world.name} />

      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-5 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(52,211,153,0.25)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.22)_0,_transparent_55%),linear-gradient(90deg,rgba(15,23,42,0.95)_0,rgba(15,23,42,0.9)_40%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.95)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                Active Quest Log
              </div>

              <h2 className="mt-2 text-lg font-semibold text-emerald-50">
                Current Contracts
              </h2>

              <p className="text-xs text-emerald-100/70">
                Track the missions you&apos;ve locked in
                across this BitGalaxy world.
              </p>
            </div>

            <div className="text-right text-[11px] text-emerald-200/80">
              <p>
                Player:{" "}
                <span className="font-semibold text-emerald-300">
                  {player.displayName ??
                    `Member ${memberId.slice(0, 8)}`}
                </span>
              </p>

              <p className="mt-0.5">
                Rank:{" "}
                <span className="font-semibold text-emerald-300">
                  {player.rank}
                </span>
              </p>

              <p className="mt-0.5">
                Total XP:{" "}
                <span className="font-semibold text-emerald-300">
                  {player.totalXP}
                </span>
              </p>

              <p className="mt-0.5 text-[10px] text-emerald-200/60">
                {activeQuests.length} active contract
                {activeQuests.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </header>

          {activeQuests.length === 0 ? (
            <div className="mt-2 rounded-xl border border-emerald-500/30 bg-slate-950/80 px-4 py-4 text-xs text-emerald-100/80">
              <p className="font-medium text-emerald-200">
                No contracts on the board yet.
              </p>

              <p className="mt-1 text-emerald-100/70">
                Open the{" "}
                <Link
                  href={`/bitgalaxy/quests?orgId=${encodeURIComponent(
                    orgId,
                  )}&memberId=${encodeURIComponent(
                    memberId,
                  )}`}
                  className="font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  Quest Directory
                </Link>{" "}
                to choose a mission and begin earning XP.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeQuests.map(
                (quest) => (
                  <ActiveQuestCard
                    key={quest.id}
                    quest={quest}
                    orgId={orgId}
                    memberId={memberId}
                  />
                ),
              )}
            </div>
          )}

          <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-200/70">
            <span>
              Progress updates as you complete check-ins,
              milestones, and arcade missions.
            </span>

            <Link
              href={`/bitgalaxy?orgId=${encodeURIComponent(
                orgId,
              )}&memberId=${encodeURIComponent(
                memberId,
              )}`}
              className="text-emerald-300/80 hover:text-emerald-200"
            >
              Back to player console
            </Link>
          </footer>
        </div>
      </section>
    </div>
  );
}