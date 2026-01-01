import Link from "next/link";
import type { BitGalaxyProgram } from "@/lib/bitgalaxy/getPrograms";

type ProgramCardProps = {
  orgId: string;
  program: BitGalaxyProgram;

  /**
   * Optional URLs for where this card should take the user:
   * - admin view in NeonHQ
   * - player-facing BitGalaxy view
   */
  adminUrl?: string;   // e.g. `/hq/${orgId}/bitgalaxy/programs/${program.id}`
  playerUrl?: string;  // e.g. `/bitgalaxy/programs/${program.id}?orgId=${orgId}`

  /**
   * Optional badges reflecting cross-app integrations:
   * maybe this season gives bonus RewardCircle points or
   * boosted Referralink XP.
   */
  rewardCircleBoostLabel?: string;
  referralinkBoostLabel?: string;
};

function formatDate(ts?: FirebaseFirestore.Timestamp) {
  if (!ts || typeof ts.toDate !== "function") return "";
  const d = ts.toDate();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProgramCard({
  orgId,
  program,
  adminUrl,
  playerUrl,
  rewardCircleBoostLabel,
  referralinkBoostLabel,
}: ProgramCardProps) {
  const startLabel = formatDate(program.startAt);
  const endLabel = formatDate(program.endAt);

  const statusLabel = program.isActive ? "Active" : "Inactive";
  const statusColor = program.isActive
    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
    : "bg-slate-700/40 text-slate-200 border-slate-500/70";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-sky-500/40 bg-slate-950/80 p-4 text-xs text-sky-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-sky-50">
              {program.name}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          {program.description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-sky-300/80">
              {program.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-sky-300/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Org:{" "}
              <span className="font-mono text-[10px] text-sky-100">
                {orgId}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              XP Multiplier:{" "}
              <span className="font-semibold text-emerald-200">
                {program.xpMultiplier.toFixed(1)}×
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Order:{" "}
              <span className="font-mono text-[10px] text-sky-200">
                {program.displayOrder ?? 0}
              </span>
            </span>
          </div>

          {(startLabel || endLabel) && (
            <p className="mt-1 text-[10px] text-sky-400/80">
              {startLabel && (
                <>
                  Starts <span className="font-semibold">{startLabel}</span>
                </>
              )}
              {startLabel && endLabel && " · "}
              {endLabel && (
                <>
                  Ends <span className="font-semibold">{endLabel}</span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 text-[10px]">
          {rewardCircleBoostLabel && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-[3px] text-emerald-200">
              {rewardCircleBoostLabel}
            </span>
          )}
          {referralinkBoostLabel && (
            <span className="rounded-full bg-amber-500/15 px-2 py-[3px] text-amber-100">
              {referralinkBoostLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-sky-400/80">
          Group quests into themed seasons or campaigns with bonus XP. Programs
          can be referenced by BitGalaxy quests, Referralink promos, and
          RewardCircle reward ladders.
        </p>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {playerUrl && (
            <Link
              href={playerUrl}
              className="rounded-full border border-sky-400/70 bg-sky-500/10 px-3 py-[5px] font-semibold text-sky-100 hover:border-sky-300 hover:bg-sky-500/15"
            >
              View as Player
            </Link>
          )}
          {adminUrl && (
            <Link
              href={adminUrl}
              className="rounded-full border border-slate-500/70 bg-slate-900/90 px-3 py-[5px] font-semibold text-sky-100 hover:border-sky-300 hover:bg-slate-800"
            >
              Edit in NeonHQ
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProgramCard;