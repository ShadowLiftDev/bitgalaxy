import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "neon-lunchbox";

type OrgWorld = {
  id: string;
  name: string;
  appsEnabled?: { BitGalaxy?: boolean };
};

async function getWorlds(): Promise<OrgWorld[]> {
  const snap = await adminDb.collection("orgs").get();

  const worlds: OrgWorld[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as any;
    const usesBitGalaxy = data.appsEnabled?.BitGalaxy === true;
    if (usesBitGalaxy) {
      worlds.push({
        id: doc.id,
        name: data.name ?? doc.id,
        appsEnabled: data.appsEnabled,
      });
    }
  });

  // Keep the list deterministic
  worlds.sort((a, b) => a.name.localeCompare(b.name));
  return worlds;
}

export const metadata = {
  title: "BitGalaxy – Mission Entry",
};

export default async function BitGalaxyLandingPage() {
  const worlds = await getWorlds();

  return (
    <main className="relative min-h-[70vh] space-y-12 text-xs text-sky-100">
      {/* Extra BitGalaxy glows on top of the global neon grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-[-10%] h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute top-10 right-[-12%] h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-cyan-500/10 via-sky-400/10 to-purple-500/10 blur-3xl" />
      </div>

      {/* Header / nav */}
      <header className="mt-2 flex items-center justify-between gap-4 rounded-2xl border border-sky-700/60 bg-slate-950/70 px-4 py-3 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9">
            <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_160deg,rgba(56,189,248,0.8),rgba(129,140,248,0.8),rgba(236,72,153,0.8),rgba(56,189,248,0.8))] blur-[6px] opacity-80" />
            <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-slate-950/90 ring-2 ring-sky-400/70 text-[10px] font-semibold tracking-[0.16em] uppercase text-sky-100">
              BG
            </div>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[0.16em] uppercase text-sky-50">
              BitGalaxy
            </span>
            <span className="text-[11px] text-sky-300/80">
              Turn your city into one continuous quest.
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-sky-300">
          <a href="#how-it-works" className="hover:text-sky-50">
            How it works
          </a>
          <a href="#for-who" className="hover:text-sky-50">
            For players & teams
          </a>
          <a href="#worlds" className="hidden sm:inline hover:text-sky-50">
            Worlds
          </a>
          <Link
            href="/demo"
            className="rounded-full border border-sky-400/80 bg-slate-900/70 px-3 py-1.5 text-[11px] font-semibold text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.45)] transition hover:bg-sky-400 hover:text-slate-950"
          >
            Guided demo
          </Link>
          <Link
            href={`/login`}
            className="text-[11px] font-semibold text-sky-200 hover:text-sky-50"
          >
            Owner login
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="grid items-center gap-10 md:grid-cols-[1.35fr_minmax(0,1fr)]">
        {/* Left: story + CTAs */}
        <div className="space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-sky-300/85">
            NeonHQ · BitGalaxy XP Engine
          </p>

          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl sm:leading-[1.1]">
            Gamify{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-purple-300 bg-clip-text text-transparent">
              every visit, event, referral,
            </span>{" "}
            and mini-game in your world.
          </h1>

          <p className="max-w-xl text-sm sm:text-base text-sky-200/90">
            BitGalaxy is the shared{" "}
            <span className="font-semibold text-cyan-200">XP engine</span> for
            the Neon Ecosystem. It listens to check-ins, purchases, referrals,
            in-venue arcade games, and surprise quests, then turns all of that
            into{" "}
            <span className="font-semibold text-purple-200">
              one continuous progression track
            </span>{" "}
            your players can see from anywhere.
          </p>

          <p className="max-w-xl text-[11px] sm:text-[13px] text-sky-300/85">
            As guests move through your universe, BitGalaxy feeds XP into
            RewardCircle for redemptions, into Referralink for invite bonuses,
            and into Directory/ProfileMatrix for identity and roles — keeping
            every app in sync with the same player heartbeat.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(56,189,248,0.55)] transition hover:brightness-110"
            >
              Explore BitGalaxy demo
            </Link>

            {/* NEW: direct link into the player arcade */}
            <Link
              href="/bitgalaxy/games"
              className="rounded-xl border border-cyan-400/80 bg-slate-950/80 px-4 py-2 text-[13px] font-semibold text-cyan-100 shadow-[0_0_26px_rgba(56,189,248,0.45)] transition hover:bg-cyan-500/10 hover:text-cyan-50"
            >
              Jump into player arcade
            </Link>

            <Link
              href="/login"
              className="text-sm text-sky-300 hover:text-sky-50"
            >
              Owner login via NeonHQ →
            </Link>
          </div>

          {/* Tiny “what it connects” strip */}
          <div className="flex flex-wrap gap-4 text-[11px] text-sky-400/90">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>
                Connects RewardCircle, Referralink, Directory, and local arcade
                missions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              <span>
                Designed for multi-location orgs & city-wide ecosystems.
              </span>
            </div>
          </div>
        </div>

        {/* Right: “Mission Control” holographic card */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[conic-gradient(from_140deg,rgba(56,189,248,0.22),rgba(129,140,248,0.28),rgba(236,72,153,0.22),rgba(56,189,248,0.22))] opacity-80 blur-2xl" />
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-4 shadow-[0_26px_70px_rgba(15,23,42,0.95)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-[11px] text-sky-400/90">
              <span>Live world snapshot · Player view</span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                Season I · Online
              </span>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
              {/* Player header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-50">
                    Player: Time Traveler
                  </div>
                  <div className="text-[11px] text-sky-400/80">
                    3 linked apps · 4 active quests
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Current Rank
                  </div>
                  <div className="text-lg font-bold text-cyan-300">
                    Underdog II
                  </div>
                </div>
              </div>

              {/* XP bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Galaxy XP progress</span>
                  <span className="text-sky-300/90">1,420 / 2,000 XP</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-[71%] bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400" />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>Next rank: Maverick</span>
                  <span>+80 XP from quests tonight</span>
                </div>
              </div>

              {/* Three “connected apps” tiles */}
              <div className="grid gap-3 text-[11px] sm:grid-cols-3">
                <div className="rounded-xl border border-cyan-400/30 bg-slate-950/85 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-cyan-300">
                    RewardCircle
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    3 rewards unlocked
                  </div>
                  <p className="mt-1 text-[11px] text-sky-300/80">
                    +20 XP per redemption, synced to wallet.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/30 bg-slate-950/85 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-300">
                    Referralink
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    2 new recruits
                  </div>
                  <p className="mt-1 text-[11px] text-sky-300/80">
                    Share links, earn XP for every confirmed visit.
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-400/30 bg-slate-950/85 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-indigo-300">
                    Directory
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    Member profile
                  </div>
                  <p className="mt-1 text-[11px] text-sky-300/80">
                    Role, org, and activity context in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-sky-50">
          How BitGalaxy works
        </h2>
        <div className="grid gap-4 text-sm text-sky-200/90 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 shadow-[0_0_24px_rgba(15,23,42,0.85)]">
            <div className="mb-1 text-xs font-semibold text-cyan-300">
              1 · Define the world
            </div>
            <p className="text-[13px]">
              Inside NeonHQ, you toggle BitGalaxy on for an org, set{" "}
              <span className="font-semibold">XP rules, programs,</span> and
              default rewards. That org becomes a “world” players can visit.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 shadow-[0_0_24px_rgba(15,23,42,0.85)]">
            <div className="mb-1 text-xs font-semibold text-cyan-300">
              2 · Launch quests & arcade missions
            </div>
            <p className="text-[13px]">
              You create quests for{" "}
              <span className="font-semibold">
                visits, purchases, events, referrals,
              </span>{" "}
              or even local mini-games in your venue. Check-in flows and arcade
              runs award XP instantly.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 shadow-[0_0_24px_rgba(15,23,42,0.85)]">
            <div className="mb-1 text-xs font-semibold text-cyan-300">
              3 · Redeem & analyze
            </div>
            <p className="text-[13px]">
              Players redeem through RewardCircle; XP, inventory, history, and
              arcade scores sync back into BitGalaxy and NeonHQ for{" "}
              <span className="font-semibold">leaderboards & analytics.</span>
            </p>
          </div>
        </div>
      </section>

      {/* For players & teams */}
      <section id="for-who" className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-sky-50">
          One engine, multiple perspectives
        </h2>
        <div className="grid gap-4 text-sm text-sky-200/90 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-800/80 bg-slate-950/90 p-4">
            <div className="mb-1 text-xs font-semibold text-cyan-300">
              Players
            </div>
            <p className="text-[13px]">
              Guests see their XP, streaks, quests, arcade stats, and rewards
              across all linked worlds from a unified player portal — whether
              they earned it at the door, at the bar, or on a mini-game screen.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-800/80 bg-slate-950/90 p-4">
            <div className="mb-1 text-xs font-semibold text-emerald-300">
              Owners & teams
            </div>
            <p className="text-[13px]">
              You manage XP rules, quests, arcade rewards, and analytics in
              NeonHQ under{" "}
              <span className="font-mono text-[11px]">
                /hq/[orgId]/bitgalaxy
              </span>
              , while your front-of-house simply runs the experience.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-800/80 bg-slate-950/90 p-4">
            <div className="mb-1 text-xs font-semibold text-purple-300">
              Ecosystem view
            </div>
            <p className="text-[13px]">
              Use BitGalaxy as the connective tissue between{" "}
              <span className="font-semibold">
                multiple venues, apps, and events
              </span>{" "}
              — a shared XP layer tying it all together.
            </p>
          </div>
        </div>
      </section>

      {/* Worlds overview */}
      <section
        id="worlds"
        className="space-y-3 rounded-2xl border border-sky-700/60 bg-slate-950/85 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-sky-50">
            Active BitGalaxy worlds
          </h2>
          {worlds.length > 0 && (
            <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">
              {worlds.length} world{worlds.length === 1 ? "" : "s"} online
            </span>
          )}
        </div>

        {worlds.length === 0 ? (
          <p className="mt-2 text-[11px] text-sky-300/80">
            No active worlds yet. Once BitGalaxy is enabled for an org in NeonHQ{" "}
            (<span className="font-mono text-[10px]">
              appsEnabled.BitGalaxy = true
            </span>
            ), it will show up here automatically.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
            {worlds.map((world) => (
              <li
                key={world.id}
                className="rounded-lg border border-sky-600/40 bg-slate-950/90 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-sky-100">
                      {world.name}
                    </div>
                    <div className="text-[10px] text-sky-400/80">
                      {world.id}
                    </div>
                  </div>
                  <Link
                    href={`/bitgalaxy/worlds/${encodeURIComponent(world.id)}`}
                    className="rounded-full border border-sky-500/70 px-3 py-1 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/10"
                  >
                    Enter (player view)
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[10px] text-sky-400/80">
          NeonHQ + ProfileMatrix act as the long-term super-hubs for player
          stats and CRM. BitGalaxy focuses on the XP, quests, arcade runs, and
          world-level progression layer they all share.
        </p>
      </section>
    </main>
  );
}