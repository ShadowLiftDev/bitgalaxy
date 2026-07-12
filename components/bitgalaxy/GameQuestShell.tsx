"use client";

import Link from "next/link";
import { ReactNode } from "react";

type GameQuestShellProps = {
  title: string;
  subtitle?: string;

  orgId: string;
  worldName?: string | null;

  memberId?: string | null;
  memberName?: string | null;
  isGuest?: boolean;

  children: ReactNode;

  badgeLabel?: string;
  returnHref?: string;
  returnLabel?: string;
};

export function GameQuestShell({
  title,
  subtitle,

  orgId,
  worldName,

  memberId,
  memberName,
  isGuest = false,

  children,

  badgeLabel = "Arcade Game",
  returnHref,
  returnLabel = "Back to games",
}: GameQuestShellProps) {
  const normalizedMemberId = memberId?.trim() || null;
  const normalizedMemberName = memberName?.trim() || null;

  const playerLabel =
    isGuest || !normalizedMemberId
      ? "Guest player"
      : normalizedMemberName ||
        `Member ${normalizedMemberId.slice(0, 8)}`;

  const resolvedWorldName =
    worldName?.trim() || orgId;

  return (
    <section className="space-y-4 rounded-2xl border border-sky-500/50 bg-slate-950/85 p-5 text-xs text-sky-100 shadow-[0_0_40px_rgba(56,189,248,0.55)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-sky-300/85">
            BitGalaxy · {badgeLabel}
          </p>

          <h1 className="mt-1 text-sm font-semibold text-sky-50">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 max-w-2xl text-[11px] text-sky-200/85">
              {subtitle}
            </p>
          )}

          {returnHref && (
            <Link
              href={returnHref}
              className="mt-3 inline-flex text-[10px] font-medium text-sky-300 underline-offset-4 hover:text-sky-100 hover:underline"
            >
              ← {returnLabel}
            </Link>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-sky-500/40 bg-slate-950/95 px-3 py-2 text-[11px] text-sky-200 sm:max-w-xs">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-sky-400/70">
              World
            </p>

            <p className="mt-1 truncate font-medium text-sky-100">
              {resolvedWorldName}
            </p>
          </div>

          <div className="mt-2">
            <p className="text-[9px] uppercase tracking-[0.2em] text-sky-400/70">
              Player
            </p>

            <p className="mt-1 break-words font-mono text-[10px] text-sky-200">
              {playerLabel}
            </p>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}