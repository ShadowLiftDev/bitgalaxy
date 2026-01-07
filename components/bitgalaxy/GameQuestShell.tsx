"use client";

import { ReactNode } from "react";

type GameQuestShellProps = {
  title: string;
  subtitle?: string;
  orgId: string;

  // 🔹 Allow null/undefined from URL + guest mode
  userId?: string | null;

  // 🔹 Optional guest flag for nicer display
  isGuest?: boolean;

  children: ReactNode;
  badgeLabel?: string;
};

export function GameQuestShell({
  title,
  subtitle,
  orgId,
  userId,
  isGuest = false,
  children,
  badgeLabel = "Side Quest",
}: GameQuestShellProps) {
  const playerLabel =
    isGuest || !userId || userId.trim() === ""
      ? "Guest player"
      : userId;

  return (
    <section className="space-y-4 rounded-2xl border border-sky-500/50 bg-slate-950/85 p-5 text-xs text-sky-100 shadow-[0_0_40px_rgba(56,189,248,0.55)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-sky-300/85">
            BitGalaxy · {badgeLabel}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-sky-50">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-[11px] text-sky-200/85">{subtitle}</p>
          )}
        </div>

        <div className="rounded-xl border border-sky-500/40 bg-slate-950/95 px-3 py-2 text-[11px] text-sky-200">
          <div className="font-mono text-[10px] text-sky-300/80">
            orgs/{orgId}
          </div>
          <div className="mt-1 text-[10px] text-sky-300/80">
            Player:{" "}
            <span className="font-mono break-all">
              {playerLabel}
            </span>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}