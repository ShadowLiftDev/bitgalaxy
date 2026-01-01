"use client";

import type { ReactNode } from "react";

export type RankUpModalProps = {
  isOpen: boolean;
  onClose: () => void;

  prevRankLabel: string;
  newRankLabel: string;
  prevLevel?: number;
  newLevel?: number;

  xpBefore: number;
  xpAfter: number;
  nextRankXp?: number | null; // optional for progress hint

  /**
   * Optional cross-app info:
   * e.g. "Referralink +10 XP" or "RewardCircle tier bonus unlocked"
   */
  integrationNote?: string;

  /**
   * Optional additional content (e.g. CTA buttons).
   */
  footerSlot?: ReactNode;
};

export function RankUpModal({
  isOpen,
  onClose,
  prevRankLabel,
  newRankLabel,
  prevLevel,
  newLevel,
  xpBefore,
  xpAfter,
  nextRankXp,
  integrationNote,
  footerSlot,
}: RankUpModalProps) {
  if (!isOpen) return null;

  const gained = xpAfter - xpBefore;
  const hasNext = typeof nextRankXp === "number" && nextRankXp > xpAfter;

  const progressToNext = hasNext
    ? Math.min(
        100,
        Math.max(
          0,
          ((xpAfter - xpBefore) / (nextRankXp! - xpBefore || 1)) * 100,
        ),
      )
    : 100;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-sky-500/60 bg-slate-950/95 p-5 shadow-2xl shadow-sky-500/40">
        {/* Cosmic header */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-400/80">
              Rank Up
            </p>
            <h2 className="text-lg font-semibold text-sky-50">
              New rank unlocked!
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        {/* Rank transition */}
        <div className="rounded-xl border border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-4">
          <p className="text-[11px] text-sky-300/80">
            You ascended from:
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-200">
              {prevRankLabel}
              {typeof prevLevel === "number" && (
                <span className="ml-1 text-[10px] text-slate-400">
                  Lvl {prevLevel}
                </span>
              )}
            </span>
            <span className="text-[10px] text-sky-400/80">→</span>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 shadow-inner shadow-emerald-500/30">
              {newRankLabel}
              {typeof newLevel === "number" && (
                <span className="ml-1 text-[10px] text-emerald-200/80">
                  Lvl {newLevel}
                </span>
              )}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-emerald-200/90">
            XP gained:{" "}
            <span className="font-semibold text-emerald-300">
              +{gained}
            </span>{" "}
            (total:{" "}
            <span className="font-mono text-emerald-200">
              {xpAfter} XP
            </span>
            )
          </p>

          {hasNext && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] text-sky-300/80">
                Progress toward next rank
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="text-[10px] text-sky-400/80">
                Next rank at{" "}
                <span className="font-mono text-sky-200">
                  {nextRankXp} XP
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Integration note */}
        {integrationNote && (
          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-[11px] text-emerald-100">
            <p className="font-semibold text-emerald-300">
              Cross-app bonus
            </p>
            <p className="mt-1 text-emerald-100/90">
              {integrationNote}
            </p>
          </div>
        )}

        {/* Footer / CTA */}
        <div className="mt-4 flex items-center justify-end gap-2">
          {footerSlot}
          {!footerSlot && (
            <button
              onClick={onClose}
              className="rounded-lg bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
            >
              Continue exploring
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankUpModal;