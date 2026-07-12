"use client";

import Link from "next/link";

export type WorldCardProps = {
  orgId: string;
  name: string;

  description?: string | null;
  locationLabel?: string | null;
  logoUrl?: string | null;

  /**
   * Optional summary fields for future directory/admin uses.
   * They are not required by the customer world selector.
   */
  activePrograms?: number;
  activeQuests?: number;
  totalPlayers?: number;
  totalXpEarned?: number;

  /**
   * Selection mode:
   *
   * When onSelect is provided, the card renders as a button and does not
   * navigate immediately.
   */
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (orgId: string) => void;

  /**
   * Navigation mode:
   *
   * Used only when onSelect is not provided.
   */
  primaryHref?: string;

  /**
   * Optional public-facing status label.
   */
  statusLabel?: string;
};

function WorldCardContent({
  orgId,
  name,
  description,
  locationLabel,
  logoUrl,
  activePrograms,
  activeQuests,
  totalPlayers,
  totalXpEarned,
  selected = false,
  statusLabel = "Live",
}: Omit<
  WorldCardProps,
  "onSelect" | "primaryHref" | "disabled"
>) {
  const hasSummaryStats =
    typeof activePrograms === "number" ||
    typeof activeQuests === "number" ||
    typeof totalPlayers === "number" ||
    typeof totalXpEarned === "number";

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                loading="lazy"
                className="h-11 w-11 shrink-0 rounded-xl border border-sky-500/40 bg-slate-950/80 object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10 text-sm font-semibold text-sky-100"
              >
                {name.trim().charAt(0).toUpperCase() || "W"}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-sky-400/80">
                BitGalaxy · World
              </p>

              <h2 className="truncate text-sm font-semibold text-sky-50">
                {name}
              </h2>

              {locationLabel && (
                <p className="mt-0.5 truncate text-[10px] text-sky-300/75">
                  {locationLabel}
                </p>
              )}
            </div>
          </div>

          <span
            className={
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] " +
              (selected
                ? "border-emerald-300/80 bg-emerald-400/15 text-emerald-100"
                : "border-sky-500/40 bg-sky-500/10 text-sky-200")
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (selected
                  ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]"
                  : "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]")
              }
            />

            {selected ? "Selected" : statusLabel}
          </span>
        </div>

        {description && (
          <p className="line-clamp-2 text-[11px] text-sky-300/80">
            {description}
          </p>
        )}
      </div>

      {hasSummaryStats && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-sky-200/90">
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
                Total XP
              </p>

              <p className="mt-0.5 text-[11px] font-semibold text-emerald-300">
                {totalXpEarned.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-sky-500/20 pt-3 text-[10px]">
        <span className="truncate text-sky-400/70">
          {locationLabel || "BitGalaxy world"}
        </span>

        <span
          className={
            selected
              ? "font-semibold text-emerald-200"
              : "font-semibold text-sky-200"
          }
        >
          {selected ? "Current world ✓" : "Select world →"}
        </span>
      </div>

      <span className="sr-only">World ID: {orgId}</span>
    </>
  );
}

export function WorldCard({
  orgId,
  name,
  description,
  locationLabel,
  logoUrl,
  activePrograms,
  activeQuests,
  totalPlayers,
  totalXpEarned,
  selected = false,
  disabled = false,
  onSelect,
  primaryHref,
  statusLabel = "Live",
}: WorldCardProps) {
  const content = (
    <WorldCardContent
      orgId={orgId}
      name={name}
      description={description}
      locationLabel={locationLabel}
      logoUrl={logoUrl}
      activePrograms={activePrograms}
      activeQuests={activeQuests}
      totalPlayers={totalPlayers}
      totalXpEarned={totalXpEarned}
      selected={selected}
      statusLabel={statusLabel}
    />
  );

  const sharedClassName =
    "group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 text-left text-xs text-sky-100 transition " +
    (selected
      ? "border-emerald-300/80 shadow-[0_0_34px_rgba(52,211,153,0.35)]"
      : "border-sky-500/40 shadow-lg shadow-sky-900/40 hover:border-sky-300/80 hover:shadow-[0_0_28px_rgba(56,189,248,0.3)]");

  if (onSelect) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(orgId)}
        className={`${sharedClassName} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div
          aria-hidden="true"
          className={
            "pointer-events-none absolute inset-0 opacity-30 mix-blend-screen " +
            (selected
              ? "[background-image:radial-gradient(circle_at_top,_rgba(52,211,153,0.4)_0,_transparent_58%)]"
              : "[background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.32)_0,_transparent_58%)]")
          }
        />

        <div className="relative flex h-full flex-col justify-between">
          {content}
        </div>
      </button>
    );
  }

  const resolvedHref =
    primaryHref ||
    `/bitgalaxy/games?orgId=${encodeURIComponent(orgId)}`;

  return (
    <Link href={resolvedHref} className={sharedClassName}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.32)_0,_transparent_58%)]"
      />

      <div className="relative flex h-full flex-col justify-between">
        {content}
      </div>
    </Link>
  );
}

export default WorldCard;