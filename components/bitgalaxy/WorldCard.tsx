import Link from "next/link";
import RankBadge from "./RankBadge";

export type WorldCardProps = {
  orgId: string;
  name: string;
  description?: string;

  /**
   * Summary stats – all optional, you can hydrate from BitGalaxy or cross-app.
   */
  activePrograms?: number;
  activeQuests?: number;
  totalPlayers?: number;
  totalXpEarned?: number;

  primaryHref?: string; // usually `/hq/[orgId]/bitgalaxy` or `/bitgalaxy?orgId=...`
};

export function WorldCard({
  orgId,
  name,
  description,
  activePrograms,
  activeQuests,
  totalPlayers,
  totalXpEarned,
  primaryHref = `/hq/${encodeURIComponent(orgId)}/bitgalaxy`,
}: WorldCardProps) {
  return (
    <Link
      href={primaryHref}
      className="group flex flex-col justify-between rounded-2xl border border-sky-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 text-xs text-sky-100 shadow-lg shadow-sky-900/40 hover:border-sky-300/80 hover:bg-slate-900/90"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-sky-400/80">
              BitGalaxy · World
            </p>
            <h2 className="truncate text-sm font-semibold text-sky-50 group-hover:text-sky-100">
              {name}
            </h2>
          </div>
          <RankBadge
            label="Live"
            variant="success"
            appScope="NeonHQ"
          />
        </div>

        {description && (
          <p className="line-clamp-2 text-[11px] text-sky-300/80">
            {description}
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-sky-200/90">
        {typeof activePrograms === "number" && (
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/80 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-sky-400/80">
              Programs
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-100">
              {activePrograms}
            </p>
          </div>
        )}

        {typeof activeQuests === "number" && (
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/80 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-sky-400/80">
              Active quests
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-100">
              {activeQuests}
            </p>
          </div>
        )}

        {typeof totalPlayers === "number" && (
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/80 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-sky-400/80">
              Players
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-100">
              {totalPlayers}
            </p>
          </div>
        )}

        {typeof totalXpEarned === "number" && (
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/80 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-sky-400/80">
              Total XP earned
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-300">
              {totalXpEarned.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-sky-300/80">
        <p className="font-mono text-[9px] text-sky-500/80">
          org: {orgId}
        </p>
        <span className="text-[10px] text-sky-300/90">
          Enter world →
        </span>
      </div>
    </Link>
  );
}

export default WorldCard;