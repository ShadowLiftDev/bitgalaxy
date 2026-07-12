import Link from "next/link";

import { BitGalaxyEntryGate } from "@/components/bitgalaxy/BitGalaxyEntryGate";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import {
  getPlayer,
  type BitGalaxyPlayer,
} from "@/lib/bitgalaxy/getPlayer";
import {
  getQuests,
  type BitGalaxyQuest,
} from "@/lib/bitgalaxy/getQuests";
import { getWorld } from "@/lib/bitgalaxy/getWorld";
import {
  getWorlds,
  type BitGalaxyWorld,
} from "@/lib/bitgalaxy/getWorlds";

type BitGalaxyGamesPageProps = {
  searchParams?: Promise<{
    orgId?: string;
    memberId?: string;
    guest?: string;
  }>;
};

type ArcadeGameId =
  | "neon-memory"
  | "galaxy-paddle"
  | "lunchbox-run"
  | "nebula-break";

type ArcadeGameDefinition = {
  id: ArcadeGameId;
  title: string;
  description: string;
  route: string;
  missionNumber: string;
  fallbackXp: number;
  articleClassName: string;
  backgroundClassName: string;
  eyebrowClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  statsBorderClassName: string;
  statsLabelClassName: string;
  statsTextClassName: string;
  emptyTextClassName: string;
  launchClassName: string;
};

const ARCADE_GAMES: ArcadeGameDefinition[] = [
  {
    id: "neon-memory",
    title: "Neon Memory",
    description:
      "Flip the neon tiles, remember the pattern, and clear the grid as efficiently as possible.",
    route: "/bitgalaxy/games/neon-memory",
    missionNumber: "01",
    fallbackXp: 50,
    articleClassName:
      "border-sky-500/50 shadow-[0_0_32px_rgba(56,189,248,0.45)]",
    backgroundClassName:
      "[background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.35)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.3)_0,_transparent_55%)]",
    eyebrowClassName: "text-sky-300/85",
    titleClassName: "text-sky-50",
    descriptionClassName: "text-sky-200/85",
    statsBorderClassName: "border-sky-500/50",
    statsLabelClassName: "text-sky-300/90",
    statsTextClassName: "text-sky-100",
    emptyTextClassName: "text-sky-300/80",
    launchClassName:
      "bg-sky-500 shadow-[0_0_24px_rgba(56,189,248,0.7)] hover:bg-sky-400",
  },
  {
    id: "galaxy-paddle",
    title: "Galaxy Paddle",
    description:
      "Hold the defensive line. Keep the neon core in play as long as you can while velocity climbs.",
    route: "/bitgalaxy/games/galaxy-paddle",
    missionNumber: "02",
    fallbackXp: 50,
    articleClassName:
      "border-indigo-500/60 shadow-[0_0_32px_rgba(129,140,248,0.45)]",
    backgroundClassName:
      "[background-image:radial-gradient(circle_at_top,_rgba(129,140,248,0.4)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.3)_0,_transparent_55%)]",
    eyebrowClassName: "text-indigo-300/85",
    titleClassName: "text-indigo-50",
    descriptionClassName: "text-indigo-100/85",
    statsBorderClassName: "border-indigo-500/60",
    statsLabelClassName: "text-indigo-300/90",
    statsTextClassName: "text-indigo-50",
    emptyTextClassName: "text-indigo-100/80",
    launchClassName:
      "bg-indigo-500 shadow-[0_0_24px_rgba(129,140,248,0.7)] hover:bg-indigo-400",
  },
  {
    id: "lunchbox-run",
    title: "Lunchbox Run",
    description:
      "Sprint the neon horizon. Jump the food stacks and chase a high score.",
    route: "/bitgalaxy/games/lunchbox-run",
    missionNumber: "03",
    fallbackXp: 50,
    articleClassName:
      "border-fuchsia-500/60 shadow-[0_0_32px_rgba(236,72,153,0.45)]",
    backgroundClassName:
      "[background-image:radial-gradient(circle_at_top,_rgba(236,72,153,0.38)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.22)_0,_transparent_55%)]",
    eyebrowClassName: "text-fuchsia-300/85",
    titleClassName: "text-fuchsia-50",
    descriptionClassName: "text-fuchsia-100/85",
    statsBorderClassName: "border-fuchsia-500/60",
    statsLabelClassName: "text-fuchsia-300/90",
    statsTextClassName: "text-fuchsia-50",
    emptyTextClassName: "text-fuchsia-100/80",
    launchClassName:
      "bg-fuchsia-500 shadow-[0_0_24px_rgba(236,72,153,0.7)] hover:bg-fuchsia-400",
  },
  {
    id: "nebula-break",
    title: "Nebula Break",
    description:
      "Drive the core through neon brickfields. Chain hits, grab power-ups, and chase a high score.",
    route: "/bitgalaxy/games/nebula-break",
    missionNumber: "04",
    fallbackXp: 75,
    articleClassName:
      "border-amber-500/60 shadow-[0_0_32px_rgba(245,158,11,0.45)]",
    backgroundClassName:
      "[background-image:radial-gradient(circle_at_top,_rgba(245,158,11,0.4)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%)]",
    eyebrowClassName: "text-amber-300/85",
    titleClassName: "text-amber-50",
    descriptionClassName: "text-amber-100/85",
    statsBorderClassName: "border-amber-500/60",
    statsLabelClassName: "text-amber-300/90",
    statsTextClassName: "text-amber-50",
    emptyTextClassName: "text-amber-100/80",
    launchClassName:
      "bg-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.7)] hover:bg-amber-400",
  },
];

export const metadata = {
  title: "BitGalaxy · Choose Your Game",
};

function withParams(
  path: string,
  params: Record<string, string | undefined | null>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
}

function formatMsToSeconds(ms?: number | null) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "–";
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function serializeWorlds(worlds: BitGalaxyWorld[]) {
  return worlds.map((world) => ({
    orgId: world.orgId,
    name: world.name,
    description: world.description,
    locationLabel: world.locationLabel,
    logoUrl: world.logoUrl,
    guestModeEnabled: world.guestModeEnabled,
  }));
}

function getQuestForGame(
  quests: BitGalaxyQuest[],
  gameId: ArcadeGameId,
) {
  return quests.find(
    (quest) =>
      quest.id === gameId &&
      quest.type === "arcade" &&
      quest.isActive,
  );
}

export default async function BitGalaxyGamesPage(
  props: BitGalaxyGamesPageProps,
) {
  const resolvedSearch = props.searchParams
    ? await props.searchParams
    : {};

  const requestedOrgId = resolvedSearch.orgId?.trim() || null;
  const isGuest = resolvedSearch.guest === "1";

  const memberId =
    !isGuest && resolvedSearch.memberId?.trim()
      ? resolvedSearch.memberId.trim()
      : null;

  const worlds = await getWorlds();
  const entryWorlds = serializeWorlds(worlds);

  const ownerOpticsBaseUrl =
    process.env.NEXT_PUBLIC_OWNEROPTICS_URL?.trim() || null;

  if (!requestedOrgId || (!memberId && !isGuest)) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName="BitGalaxy" />

        <BitGalaxyEntryGate
          worlds={entryWorlds}
          initialOrgId={requestedOrgId}
          redirectBase="/bitgalaxy/games"
          ownerOpticsBaseUrl={ownerOpticsBaseUrl}
        />
      </div>
    );
  }

  const world = await getWorld(requestedOrgId);

  const worldIsAvailable =
    world !== null &&
    world.status === "active" &&
    world.allowPublicAccess === true;

  if (!worldIsAvailable) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName="BitGalaxy" />

        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-100">
          <h1 className="text-base font-semibold text-rose-50">
            This BitGalaxy world is unavailable
          </h1>

          <p className="mt-2 text-[11px] text-rose-200/85">
            The selected organization does not currently have a public,
            active BitGalaxy world.
          </p>
        </section>

        <BitGalaxyEntryGate
          worlds={entryWorlds}
          redirectBase="/bitgalaxy/games"
          ownerOpticsBaseUrl={ownerOpticsBaseUrl}
        />
      </div>
    );
  }

  if (isGuest && !world.guestModeEnabled) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={world.name} />

        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
          <h1 className="text-base font-semibold text-amber-50">
            Guest access is unavailable
          </h1>

          <p className="mt-2 text-[11px] text-amber-200/85">
            This world requires a connected OwnerOptics member profile.
          </p>
        </section>

        <BitGalaxyEntryGate
          worlds={entryWorlds}
          initialOrgId={world.orgId}
          redirectBase="/bitgalaxy/games"
          ownerOpticsBaseUrl={ownerOpticsBaseUrl}
          allowGuestMode={false}
        />
      </div>
    );
  }

  let player: BitGalaxyPlayer | null = null;
  let quests: BitGalaxyQuest[] = [];

  if (isGuest) {
    quests = await getQuests(world.orgId, {
      activeOnly: true,
    });
  } else {
    [player, quests] = await Promise.all([
      getPlayer(world.orgId, memberId as string),
      getQuests(world.orgId, {
        activeOnly: true,
      }),
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
              Your member profile is not connected to this BitGalaxy world.
              Select the correct world and locate your profile again.
            </p>
          </section>

          <BitGalaxyEntryGate
            worlds={entryWorlds}
            initialOrgId={world.orgId}
            redirectBase="/bitgalaxy/games"
            ownerOpticsBaseUrl={ownerOpticsBaseUrl}
          />
        </div>
      );
    }
  }

  const activeGames = ARCADE_GAMES.map((game) => ({
    definition: game,
    quest: getQuestForGame(quests, game.id),
  })).filter(
    (
      entry,
    ): entry is {
      definition: ArcadeGameDefinition;
      quest: BitGalaxyQuest;
    } => Boolean(entry.quest),
  );

  const gameRecords =
    !isGuest && player
      ? player.specialEvents
      : null;

  const neonMemory = gameRecords?.neonMemory;
  const galaxyPaddle = gameRecords?.galaxyPaddle;
  const lunchboxRun = gameRecords?.lunchboxRun;
  const nebulaBreak = gameRecords?.nebulaBreak;

  const playerLabel =
    !isGuest && player
      ? player.displayName ||
        `Member ${player.memberId.slice(0, 6)}`
      : "Guest player";

  const playerMemberId = memberId ?? "";

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={world.name} />

      {isGuest && (
        <div className="rounded-2xl border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-100">
          Guest mode · XP and official high scores are disabled for this
          session.
        </div>
      )}

      <header className="rounded-2xl border border-sky-500/30 bg-slate-950/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-sky-400/90">
          BitGalaxy · {world.name}
        </p>

        <h1 className="mt-1 text-lg font-semibold text-sky-50 sm:text-xl">
          Choose a game for {playerLabel}
        </h1>

        <p className="mt-1 text-[11px] text-sky-200/85">
          Complete a game to earn its configured XP reward. Replay anytime to
          improve your official high score.
        </p>

        {world.locationLabel && (
          <p className="mt-2 text-[10px] text-sky-400/70">
            Current world: {world.name}
          </p>
        )}
      </header>

      {activeGames.length === 0 ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
          <h2 className="font-semibold text-amber-50">
            No arcade games are currently available
          </h2>

          <p className="mt-1 text-[11px] text-amber-200/85">
            This world does not currently have any active arcade game
            definitions.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {activeGames.map(({ definition, quest }) => {
            const isCompleted =
              definition.id === "neon-memory"
                ? neonMemory?.completed ?? false
                : definition.id === "galaxy-paddle"
                  ? galaxyPaddle?.completed ?? false
                  : definition.id === "lunchbox-run"
                    ? lunchboxRun?.completed ?? false
                    : nebulaBreak?.completed ?? false;

            const launchHref = isGuest
              ? withParams(definition.route, {
                  orgId: world.orgId,
                  guest: "1",
                })
              : withParams(definition.route, {
                  orgId: world.orgId,
                  memberId: playerMemberId,
                });

            return (
              <article
                key={definition.id}
                className={`relative flex flex-col rounded-2xl border bg-slate-950/90 p-4 ${definition.articleClassName}`}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 opacity-40 mix-blend-screen ${definition.backgroundClassName}`}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-[10px] uppercase tracking-[0.26em] ${definition.eyebrowClassName}`}
                      >
                        Arcade Game · {definition.missionNumber}
                      </p>

                      <h2
                        className={`mt-1 text-sm font-semibold ${definition.titleClassName}`}
                      >
                        {definition.title}
                      </h2>

                      <p
                        className={`mt-1 text-[11px] ${definition.descriptionClassName}`}
                      >
                        {definition.description}
                      </p>
                    </div>

                    {!isGuest && isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/70 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 text-[11px] text-sky-100 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-400/60 bg-emerald-500/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/90">
                        XP on completion
                      </p>

                      <p className="mt-1 text-sm font-semibold text-emerald-50">
                        +{quest.xp ?? definition.fallbackXp} XP
                      </p>

                      <p className="mt-1 text-[10px] text-emerald-200/80">
                        One-time completion reward.
                        {isGuest && " XP is disabled in guest mode."}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl border bg-slate-950/95 px-3 py-2 ${definition.statsBorderClassName}`}
                    >
                      <p
                        className={`text-[10px] uppercase tracking-[0.24em] ${definition.statsLabelClassName}`}
                      >
                        Best run
                      </p>

                      {definition.id === "neon-memory" ? (
                        !isGuest &&
                        (neonMemory?.bestTimeMs ||
                          neonMemory?.bestMoves) ? (
                          <div className="mt-1 space-y-1">
                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Time:{" "}
                              {formatMsToSeconds(
                                neonMemory?.bestTimeMs,
                              )}
                            </p>

                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Moves: {neonMemory?.bestMoves ?? "–"}
                            </p>
                          </div>
                        ) : (
                          <p
                            className={`mt-1 text-[10px] ${definition.emptyTextClassName}`}
                          >
                            {isGuest
                              ? "Guest runs are not logged."
                              : "No official run logged yet."}
                          </p>
                        )
                      ) : definition.id === "galaxy-paddle" ? (
                        !isGuest &&
                        (galaxyPaddle?.bestHits ||
                          galaxyPaddle?.bestTimeMs ||
                          galaxyPaddle?.bestMaxSpeed) ? (
                          <div className="mt-1 space-y-1">
                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Returns: {galaxyPaddle?.bestHits ?? "–"}
                            </p>

                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Time:{" "}
                              {formatMsToSeconds(
                                galaxyPaddle?.bestTimeMs,
                              )}
                            </p>

                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Max V:{" "}
                              {typeof galaxyPaddle?.bestMaxSpeed ===
                              "number"
                                ? galaxyPaddle.bestMaxSpeed.toFixed(1)
                                : "–"}
                            </p>
                          </div>
                        ) : (
                          <p
                            className={`mt-1 text-[10px] ${definition.emptyTextClassName}`}
                          >
                            {isGuest
                              ? "Guest runs are not logged."
                              : "No official run logged yet."}
                          </p>
                        )
                      ) : definition.id === "lunchbox-run" ? (
                        !isGuest &&
                        (lunchboxRun?.bestScore ||
                          lunchboxRun?.bestTimeMs ||
                          lunchboxRun?.bestJumps) ? (
                          <div className="mt-1 space-y-1">
                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Score: {lunchboxRun?.bestScore ?? "–"}
                            </p>

                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Time:{" "}
                              {formatMsToSeconds(
                                lunchboxRun?.bestTimeMs,
                              )}
                            </p>

                            <p
                              className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                            >
                              Jumps: {lunchboxRun?.bestJumps ?? "–"}
                            </p>
                          </div>
                        ) : (
                          <p
                            className={`mt-1 text-[10px] ${definition.emptyTextClassName}`}
                          >
                            {isGuest
                              ? "Guest runs are not logged."
                              : "No official run logged yet."}
                          </p>
                        )
                      ) : !isGuest &&
                        (nebulaBreak?.bestScore ||
                          nebulaBreak?.bestBricks ||
                          nebulaBreak?.bestTimeMs) ? (
                        <div className="mt-1 space-y-1">
                          <p
                            className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                          >
                            Score: {nebulaBreak?.bestScore ?? "–"}
                          </p>

                          <p
                            className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                          >
                            Bricks: {nebulaBreak?.bestBricks ?? "–"}
                          </p>

                          <p
                            className={`font-mono text-[11px] ${definition.statsTextClassName}`}
                          >
                            Time:{" "}
                            {formatMsToSeconds(
                              nebulaBreak?.bestTimeMs,
                            )}
                          </p>
                        </div>
                      ) : (
                        <p
                          className={`mt-1 text-[10px] ${definition.emptyTextClassName}`}
                        >
                          {isGuest
                            ? "Guest runs are not logged."
                            : "No official run logged yet."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      href={launchHref}
                      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold text-slate-950 transition ${definition.launchClassName}`}
                    >
                      Launch {definition.title}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}