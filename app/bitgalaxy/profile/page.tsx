import Link from "next/link";

import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { XPProgressBar } from "@/components/bitgalaxy/XPProgressBar";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getWorld } from "@/lib/bitgalaxy/getWorld";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";

export const metadata = {
  title: "BitGalaxy · Profile",
};

type ResolvedSearchParams = {
  orgId?: string;
  memberId?: string;
};

type BitGalaxyProfilePageProps = {
  searchParams?: Promise<ResolvedSearchParams>;
};

export default async function BitGalaxyProfilePage({
  searchParams,
}: BitGalaxyProfilePageProps) {
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
            A profile must be viewed within a valid organization world.
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
          orgName={world?.name ?? "BitGalaxy"}
        />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            BitGalaxy world unavailable
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            This organization does not currently have an active public
            BitGalaxy world.
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

        <section className="mt-2 space-y-4">
          <div className="rounded-2xl border border-emerald-500/40 bg-slate-950/90 p-4 text-[11px] text-emerald-100">
            <h1 className="text-base font-semibold text-emerald-50">
              Link a member to view profile
            </h1>

            <p className="mt-2 text-xs text-emerald-200/85">
              Enter the phone number or email connected to your OwnerOptics
              member profile. Once located, this console will show your rank,
              XP, and quest footprint for this world.
            </p>
          </div>

          <PlayerLookupGate
            orgId={orgId}
            redirectBase="/bitgalaxy/profile"
          />
        </section>
      </div>
    );
  }

  const player = await getPlayer(
    orgId,
    memberId,
  );

  if (!player) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            Member profile could not be loaded
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            The selected member is not connected to this BitGalaxy world.
            Locate the profile again before continuing.
          </p>
        </section>

        <PlayerLookupGate
          orgId={orgId}
          redirectBase="/bitgalaxy/profile"
        />
      </div>
    );
  }

  const progress = getRankProgress(
    player.totalXP,
  );

  const totalCompleted =
    player.completedQuestIds.length;

  const activeCount =
    player.activeQuestIds.length;

  const displayName =
    player.displayName ??
    `Member ${memberId.slice(0, 8)}`;

  const activeHref =
    `/bitgalaxy/active?orgId=${encodeURIComponent(orgId)}` +
    `&memberId=${encodeURIComponent(memberId)}`;

  const consoleHref =
    `/bitgalaxy?orgId=${encodeURIComponent(orgId)}` +
    `&memberId=${encodeURIComponent(memberId)}`;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={world.name} />

      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(16,185,129,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.9)_40%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                Pilot Profile
              </div>

              <h2 className="mt-2 text-lg font-semibold text-emerald-50">
                {displayName}
              </h2>

              <p className="text-xs text-emerald-100/80">
                XP, rank, and quest history for {world.name}.
              </p>
            </div>

            <div className="flex gap-4 rounded-xl border border-emerald-500/40 bg-slate-950/80 px-4 py-3 text-xs text-emerald-100 shadow-[0_0_24px_rgba(15,23,42,0.95)]">
              <div className="flex flex-col">
                <span className="text-[11px] text-emerald-300/90">
                  Rank
                </span>

                <span className="mt-0.5 text-base font-semibold text-emerald-50">
                  {player.rank}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-emerald-300/90">
                  Level
                </span>

                <span className="mt-0.5 text-base font-semibold text-emerald-50">
                  {player.level}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-emerald-300/90">
                  Total XP
                </span>

                <span className="mt-0.5 text-base font-semibold text-emerald-50">
                  {player.totalXP}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-200/85">
              <span className="font-semibold text-emerald-200">
                Rank trajectory
              </span>

              <span>
                {progress.currentXP} / {progress.tierMaxXP} XP to{" "}
                <span className="font-semibold text-emerald-100">
                  next rank
                </span>
              </span>
            </div>

            <div className="mt-3">
              <XPProgressBar
                rank={progress.rank}
                currentXP={progress.currentXP}
                tierMinXP={progress.tierMinXP}
                tierMaxXP={progress.tierMaxXP}
                progressPercent={progress.progressPercent}
              />
            </div>
          </div>

          <div className="grid gap-3 text-xs text-emerald-100/85 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.95)]">
              <div className="text-[11px] text-emerald-300/90">
                Active contracts
              </div>

              <div className="mt-1 text-xl font-semibold text-emerald-50">
                {activeCount}
              </div>

              <p className="mt-1 text-[11px] text-emerald-200/75">
                Missions currently live in your queue.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.95)]">
              <div className="text-[11px] text-emerald-300/90">
                Completed quests
              </div>

              <div className="mt-1 text-xl font-semibold text-emerald-50">
                {totalCompleted}
              </div>

              <p className="mt-1 text-[11px] text-emerald-200/75">
                Historical wins recorded in this world.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.95)]">
              <div className="text-[11px] text-emerald-300/90">
                Weekly XP
              </div>

              <div className="mt-1 text-xl font-semibold text-emerald-50">
                {player.weeklyXP}
              </div>

              <p className="mt-1 text-[11px] text-emerald-200/75">
                XP earned during the current BitGalaxy week.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.95)]">
              <div className="text-[11px] text-emerald-300/90">
                Current program
              </div>

              <div className="mt-1 break-words text-sm font-semibold text-emerald-50">
                {player.currentProgramId ?? "None"}
              </div>

              <p className="mt-1 text-[11px] text-emerald-200/75">
                The progression track currently connected to this profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/20 pt-4 text-[11px]">
            <p className="text-emerald-200/75">
              This profile reflects canonical BitGalaxy state for this member
              and organization.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={activeHref}
                className="text-emerald-300 hover:text-emerald-200"
              >
                View active quests
              </Link>

              <Link
                href={consoleHref}
                className="text-emerald-300 hover:text-emerald-200"
              >
                Back to player console
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}