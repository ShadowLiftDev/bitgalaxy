import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/bitgalaxy/leaderboard";

export type ExtendedLeaderboardEntry = LeaderboardEntry & {
  displayName?: string | null;
  avatarUrl?: string | null;

  // Cross-app stats
  totalReferrals?: number;   // Referralink
  loyaltyPoints?: number;    // RewardCircle
};

type LeaderboardTableProps = {
  orgId: string;
  entries: ExtendedLeaderboardEntry[];

  highlightUserId?: string;

  /**
   * Optional URLs to tie rows back to each app inside NeonHQ.
   * Use templates or pre-built URLs from the parent.
   */
  buildHqProfileUrl?: (entry: ExtendedLeaderboardEntry) => string | undefined;
  buildRewardCircleUrl?: (
    entry: ExtendedLeaderboardEntry,
  ) => string | undefined;
  buildReferralinkUrl?: (
    entry: ExtendedLeaderboardEntry,
  ) => string | undefined;
};

export function LeaderboardTable({
  orgId,
  entries,
  highlightUserId,
  buildHqProfileUrl,
  buildRewardCircleUrl,
  buildReferralinkUrl,
}: LeaderboardTableProps) {
  if (!entries.length) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-4 text-xs text-slate-300">
        No players on the leaderboard yet. Once players start earning XP in
        BitGalaxy, they&apos;ll appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-sky-500/40 bg-slate-950/80">
      <div className="border-b border-sky-500/30 bg-slate-900/90 px-4 py-3">
        <h2 className="text-sm font-semibold text-sky-100">
          Top Explorers – {orgId}
        </h2>
        <p className="mt-1 text-[11px] text-sky-300/80">
          XP is earned via BitGalaxy quests, check-ins, and integrated rewards
          from Referralink & RewardCircle.
        </p>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="min-w-full text-left text-xs text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur">
            <tr>
              <th className="px-4 py-2 font-medium text-slate-400">#</th>
              <th className="px-4 py-2 font-medium text-slate-400">
                Player
              </th>
              <th className="px-4 py-2 font-medium text-slate-400">
                BitGalaxy Rank
              </th>
              <th className="px-4 py-2 font-medium text-slate-400">
                Total XP
              </th>
              <th className="px-4 py-2 font-medium text-slate-400">
                Loyalty Pts
              </th>
              <th className="px-4 py-2 font-medium text-slate-400">
                Referrals
              </th>
              <th className="px-4 py-2 font-medium text-slate-400">
                Apps
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const isMe = entry.userId === highlightUserId;
              const rowClass = isMe
                ? "bg-sky-900/40"
                : index < 3
                ? "bg-slate-900/60"
                : "bg-slate-950/40";

              const profileUrl = buildHqProfileUrl?.(entry);
              const rewardUrl = buildRewardCircleUrl?.(entry);
              const referralUrl = buildReferralinkUrl?.(entry);

              return (
                <tr
                  key={entry.userId}
                  className={`${rowClass} border-t border-slate-800/70`}
                >
                  <td className="px-4 py-2 text-[11px] text-slate-300">
                    #{index + 1}
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800/80 text-[11px]">
                        {entry.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.avatarUrl}
                            alt={entry.displayName || entry.userId}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="select-none">
                            {entry.displayName?.[0]?.toUpperCase() ||
                              entry.userId[0]?.toUpperCase() ||
                              "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          {profileUrl ? (
                            <Link
                              href={profileUrl}
                              className="truncate text-xs font-semibold text-sky-100 hover:underline"
                            >
                              {entry.displayName || entry.userId}
                            </Link>
                          ) : (
                            <span className="truncate text-xs font-semibold text-sky-100">
                              {entry.displayName || entry.userId}
                            </span>
                          )}
                          {isMe && (
                            <span className="rounded-full bg-sky-500/20 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wide text-sky-200">
                              You
                            </span>
                          )}
                        </div>
                        <p className="mt-[2px] text-[10px] font-mono text-slate-400">
                          ID: {entry.userId}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-2 text-[11px] text-sky-200">
                    {entry.rank}
                  </td>

                  <td className="px-4 py-2 text-[11px] font-semibold text-emerald-300">
                    {entry.totalXP.toLocaleString()}
                  </td>

                  <td className="px-4 py-2 text-[11px] text-amber-200">
                    {typeof entry.loyaltyPoints === "number"
                      ? entry.loyaltyPoints.toLocaleString()
                      : "—"}
                  </td>

                  <td className="px-4 py-2 text-[11px] text-violet-200">
                    {typeof entry.totalReferrals === "number"
                      ? entry.totalReferrals.toLocaleString()
                      : "—"}
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1 text-[9px]">
                      <span className="rounded-full bg-sky-500/20 px-2 py-[2px] text-sky-100">
                        BitGalaxy
                      </span>
                      {typeof entry.loyaltyPoints === "number" && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-[2px] text-emerald-100">
                          RewardCircle
                        </span>
                      )}
                      {typeof entry.totalReferrals === "number" && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-[2px] text-amber-100">
                          Referralink
                        </span>
                      )}

                      {rewardUrl && (
                        <Link
                          href={rewardUrl}
                          className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-[2px] text-[9px] font-semibold text-emerald-100 hover:border-emerald-300"
                        >
                          Loyalty
                        </Link>
                      )}

                      {referralUrl && (
                        <Link
                          href={referralUrl}
                          className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[2px] text-[9px] font-semibold text-amber-100 hover:border-amber-300"
                        >
                          Referrals
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaderboardTable;