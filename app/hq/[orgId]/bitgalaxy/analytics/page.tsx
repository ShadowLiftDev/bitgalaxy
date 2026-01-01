import { adminDb } from "@/lib/firebase-admin";

type OrgParams = { orgId: string };

type BitGalaxyAnalyticsPageProps = {
  params: Promise<OrgParams>;
};

export const metadata = {
  title: "BitGalaxy – Analytics",
};

async function getAnalytics(orgId: string) {
  const playersSnap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyPlayers")
    .get();

  const totalPlayers = playersSnap.size;
  let totalXP = 0;
  let activePlayers = 0;
  const rankCounts: Record<string, number> = {};

  playersSnap.forEach((doc) => {
    const data = doc.data() as any;
    const xp = Number(data.totalXP ?? 0);
    const rank = data.rank ?? "Unranked";

    totalXP += xp;
    if (xp > 0) activePlayers += 1;

    rankCounts[rank] = (rankCounts[rank] ?? 0) + 1;
  });

  const avgXP = totalPlayers > 0 ? totalXP / totalPlayers : 0;

  return {
    totalPlayers,
    totalXP,
    avgXP,
    activePlayers,
    rankCounts,
  };
}

export default async function BitGalaxyAnalyticsPage({
  params,
}: BitGalaxyAnalyticsPageProps) {
  const { orgId } = await params;
  const decodedOrgId = decodeURIComponent(orgId);

  const analytics = await getAnalytics(decodedOrgId);

  const ranks = Object.entries(analytics.rankCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
          BitGalaxy · Analytics Node
        </div>
        <h2 className="text-sm font-semibold text-sky-50">
          World Analytics Overview
        </h2>
        <p className="text-xs text-sky-200/85">
          High-level XP and rank distribution for this BitGalaxy world.
          NeonHQ + ProfileMatrix can stack on deeper funnels, but this view
          tells you how the game layer itself is performing.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/85 p-5 text-xs text-sky-100 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
        {/* holo wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,118,110,0.2)_0,_transparent_55%)]"
        />

        <div className="relative space-y-5">
          {/* KPI GRID */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-sky-500/35 bg-slate-950/95 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
              <div className="text-[11px] text-sky-300/80">Total players</div>
              <div className="mt-1 text-lg font-semibold text-sky-50">
                {analytics.totalPlayers}
              </div>
              <p className="mt-1 text-[11px] text-sky-300/75">
                Unique BitGalaxy profiles in this world.
              </p>
            </div>

            <div className="rounded-xl border border-sky-500/35 bg-slate-950/95 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
              <div className="text-[11px] text-sky-300/80">Active players</div>
              <div className="mt-1 text-lg font-semibold text-sky-50">
                {analytics.activePlayers}
              </div>
              <p className="mt-1 text-[11px] text-sky-300/75">
                XP &gt; 0 — players who&apos;ve actually engaged.
              </p>
            </div>

            <div className="rounded-xl border border-sky-500/35 bg-slate-950/95 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
              <div className="text-[11px] text-sky-300/80">Total XP</div>
              <div className="mt-1 text-lg font-semibold text-sky-50">
                {analytics.totalXP}
              </div>
              <p className="mt-1 text-[11px] text-sky-300/75">
                Sum of XP awarded across all players.
              </p>
            </div>

            <div className="rounded-xl border border-sky-500/35 bg-slate-950/95 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
              <div className="text-[11px] text-sky-300/80">
                Avg XP per player
              </div>
              <div className="mt-1 text-lg font-semibold text-sky-50">
                {analytics.avgXP.toFixed(1)}
              </div>
              <p className="mt-1 text-[11px] text-sky-300/75">
                Quick health check of overall progression pacing.
              </p>
            </div>
          </div>

          {/* RANK DISTRIBUTION */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-sky-100">
                Rank distribution
              </h3>
              {analytics.totalPlayers > 0 && (
                <span className="text-[10px] text-sky-300/80">
                  {analytics.totalPlayers} players ·{" "}
                  {Object.keys(analytics.rankCounts).length} ranks
                </span>
              )}
            </div>

            {ranks.length === 0 ? (
              <p className="mt-2 text-[11px] text-sky-300/80">
                No rank data yet — once players begin earning XP, you&apos;ll
                see how they cluster across your rank ladder.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
                {ranks.map(([rank, count]) => {
                  const percentage =
                    analytics.totalPlayers > 0
                      ? (count / analytics.totalPlayers) * 100
                      : 0;

                  return (
                    <div
                      key={rank}
                      className="rounded-xl border border-sky-500/35 bg-slate-950/95 px-3 py-2 shadow-[0_0_16px_rgba(15,23,42,0.9)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sky-50">
                          {rank}
                        </span>
                        <span className="text-sky-300/90">
                          {count} player{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/90">
                        <div
                          className="h-full rounded-full bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-sky-300/80">
                        {percentage.toFixed(1)}% of players
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-sky-300/80">
            This node focuses specifically on BitGalaxy signals. For cross-app
            funnels (visits, spending, referrals) pipe this data into{" "}
            <span className="font-mono">analyticsEngine</span> +{" "}
            <span className="font-mono">ProfileMatrix</span> so you can see how
            XP behavior correlates with revenue and retention across the Neon
            Ecosystem.
          </p>
        </div>
      </section>
    </div>
  );
}