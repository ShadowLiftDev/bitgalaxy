export type XPProgressBarProps = {
  // matches how your BitGalaxy pages already call it
  rank?: string;
  currentXP: number;
  tierMinXP?: number; // defaults to 0
  tierMaxXP: number;  // next threshold (or Infinity-like sentinel)

  // optional overrides
  label?: string;
  showNumbers?: boolean;
  compact?: boolean;
  progressPercent?: number; // optional: if you already computed it
};

export function XPProgressBar({
  rank,
  currentXP,
  tierMinXP = 0,
  tierMaxXP,
  label,
  showNumbers = true,
  compact = false,
  progressPercent,
}: XPProgressBarProps) {
  const safeMin = Number.isFinite(tierMinXP) ? tierMinXP : 0;
  const safeMax =
    Number.isFinite(tierMaxXP) && tierMaxXP > safeMin ? tierMaxXP : safeMin + 1;

  const clamped = Math.min(Math.max(currentXP, safeMin), safeMax);

  const pct =
    typeof progressPercent === "number" && Number.isFinite(progressPercent)
      ? Math.min(Math.max(progressPercent, 0), 100)
      : ((clamped - safeMin) / (safeMax - safeMin)) * 100;

  const remaining = Math.max(0, safeMax - currentXP);

  return (
    <div className="space-y-1">
      {(label || rank) && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide text-emerald-300/90">
            {label ?? rank ?? "Rank progress"}
          </p>

          {showNumbers && (
            <p className="text-[10px] text-emerald-200/80">
              {clamped.toLocaleString()} / {safeMax.toLocaleString()} XP
            </p>
          )}
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-full bg-slate-800 ${
          compact ? "h-1.5" : "h-2.5"
        }`}
      >
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {showNumbers && !compact && (
        <p className="text-[10px] text-emerald-200/70">
          {remaining > 0
            ? `${remaining.toLocaleString()} XP until next rank`
            : "Max rank reached for this band"}
        </p>
      )}
    </div>
  );
}

export default XPProgressBar;