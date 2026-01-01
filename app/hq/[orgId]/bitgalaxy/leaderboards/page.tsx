import { getOrgLeaderboard } from "@/lib/bitgalaxy/leaderboard";

type OrgParams = { orgId: string };

type BitGalaxyAdminLeaderboardPageProps = {
  params: Promise<OrgParams>;
  searchParams?: { limit?: string };
};

export const metadata = {
  title: "BitGalaxy – Org Leaderboards",
};

export default async function BitGalaxyAdminLeaderboardPage({
  params,
  searchParams,
}: BitGalaxyAdminLeaderboardPageProps) {
  const { orgId } = await params;
  const decodedOrgId = decodeURIComponent(orgId);

  const limit = Number(searchParams?.limit ?? 50);
  const safeLimit = Number.isNaN(limit)
    ? 50
    : Math.min(Math.max(limit, 1), 200);

  const leaderboard = await getOrgLeaderboard(decodedOrgId, safeLimit);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/60 bg-violet-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
            Admin · Leaderboard
          </div>
          <h2 className="mt-2 text-sm font-semibold text-violet-50">
            World Rankings (Admin View)
          </h2>
          <p className="text-xs text-violet-100/85">
            Top players in this BitGalaxy world, ranked by total XP. Use this
            as a raw leaderboard feed for rewards, shoutouts, or exports.
          </p>
        </div>
        <div className="text-xs text-violet-200/85">
          Showing top {leaderboard.length} player
          {leaderboard.length === 1 ? "" : "s"}
        </div>
      </header>

      {leaderboard.length === 0 ? (
        <p className="rounded-xl border border-violet-500/40 bg-slate-950/90 px-4 py-3 text-xs text-violet-100/85 shadow-[0_0_24px_rgba(15,23,42,0.95)]">
          No players have earned XP yet. Once players begin completing quests
          and checking in, rankings will populate automatically.
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-slate-950/85 shadow-[0_0_40px_rgba(139,92,246,0.45)]">
          {/* holo wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(129,140,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%)]"
          />

          <div className="relative overflow-x-auto rounded-2xl border border-slate-900/80 bg-slate-950/95">
            <table className="min-w-full text-left text-xs text-violet-50">
              <thead className="border-b border-slate-800/80 bg-slate-950/95 text-[11px] uppercase tracking-wide text-violet-300/85">
                <tr>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">User ID</th>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2 text-right">Total XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    className={
                      "border-b border-slate-900/80 last:border-b-0 " +
                      (index === 0
                        ? "bg-violet-900/40"
                        : index % 2 === 0
                        ? "bg-slate-950/70"
                        : "bg-slate-950/40")
                    }
                  >
                    <td className="px-3 py-2 text-[11px] text-violet-200/90">
                      #{index + 1}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-violet-50">
                      {entry.userId}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-violet-200/90">
                      {entry.rank}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] font-semibold text-violet-50">
                      {entry.totalXP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-violet-200/80">
        For CSV export, season-specific boards, or cross-app overlays (e.g.,
        &quot;top players who also spent in RewardCircle&quot;), use this data
        as an input into NeonHQ reports + ProfileMatrix. BitGalaxy stays the
        event engine; those hubs stay the reporting brain.
      </p>
    </div>
  );
}