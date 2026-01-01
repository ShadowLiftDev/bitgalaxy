import type { ReactNode } from "react";

export type RankBadgeVariant = "primary" | "success" | "warning" | "neutral";

export type RankBadgeProps = {
  label: string;                // e.g. "Underdog", "Maverick", "Legend"
  level?: number;               // optional numeric level
  variant?: RankBadgeVariant;   // visual flavor
  appScope?: "BitGalaxy" | "RewardCircle" | "Referralink" | string;
  icon?: ReactNode;             // optional icon
  className?: string;
};

const variantClasses: Record<RankBadgeVariant, string> = {
  primary:
    "border-sky-400/80 bg-sky-500/10 text-sky-100",
  success:
    "border-emerald-400/80 bg-emerald-500/10 text-emerald-100",
  warning:
    "border-amber-400/80 bg-amber-500/10 text-amber-100",
  neutral:
    "border-slate-500/80 bg-slate-900/80 text-slate-100",
};

export function RankBadge({
  label,
  level,
  variant = "primary",
  appScope,
  icon,
  className = "",
}: RankBadgeProps) {
  const classes =
    variantClasses[variant] ??
    variantClasses.primary;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide ${classes} ${className}`}
    >
      {icon && (
        <span className="inline-flex h-3 w-3 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="truncate">
        {label}
        {typeof level === "number" && (
          <span className="ml-1 text-[9px] opacity-80">
            · Lvl {level}
          </span>
        )}
      </span>
      {appScope && (
        <span className="ml-1 rounded-full bg-black/20 px-1.5 text-[8px] font-normal tracking-tight text-sky-200/70">
          {appScope}
        </span>
      )}
    </span>
  );
}

export default RankBadge;