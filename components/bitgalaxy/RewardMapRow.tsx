"use client";

type RewardMapValue = {
  xpThreshold: number;
  rewardId: string | null;
  label: string;
};

type RewardOption = {
  id: string;
  label: string;
  // optional app source; usually "RewardCircle"
  sourceApp?: string;
};

export type RewardMapRowProps = {
  index: number;
  value: RewardMapValue;
  onChange: (next: RewardMapValue) => void;
  onRemove?: () => void;

  rewardOptions?: RewardOption[];
};

export function RewardMapRow({
  index,
  value,
  onChange,
  onRemove,
  rewardOptions = [],
}: RewardMapRowProps) {
  const handleThresholdChange = (raw: string) => {
    const n = Number(raw);
    onChange({
      ...value,
      xpThreshold: Number.isNaN(n) ? 0 : n,
    });
  };

  const handleLabelChange = (label: string) => {
    onChange({ ...value, label });
  };

  const handleRewardChange = (rewardId: string) => {
    onChange({
      ...value,
      rewardId: rewardId || null,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sky-500/30 bg-slate-950/80 p-3 text-xs text-sky-100 md:flex-row md:items-center">
      <div className="flex items-center gap-2 md:w-10">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/90 text-[11px] text-sky-300">
          {index + 1}
        </span>
      </div>

      {/* XP threshold */}
      <div className="flex-1 space-y-1">
        <label className="text-[10px] text-sky-300/90">
          XP threshold
        </label>
        <input
          type="number"
          min={0}
          value={value.xpThreshold}
          onChange={(e) => handleThresholdChange(e.target.value)}
          className="w-full max-w-[120px] rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-1.5 text-xs text-sky-50 outline-none focus:border-sky-300"
        />
        <p className="text-[10px] text-sky-400/80">
          Players reaching this XP unlock the mapped reward.
        </p>
      </div>

      {/* Label */}
      <div className="flex-1 space-y-1">
        <label className="text-[10px] text-sky-300/90">
          Display label
        </label>
        <input
          value={value.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. 'Neon Snack Pack' or '1000 XP Milestone'"
          className="w-full rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-1.5 text-xs text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
        />
      </div>

      {/* Reward select */}
      <div className="flex-1 space-y-1">
        <label className="text-[10px] text-sky-300/90">
          RewardCircle reward (optional)
        </label>
        <select
          value={value.rewardId ?? ""}
          onChange={(e) => handleRewardChange(e.target.value)}
          className="w-full rounded-lg border border-emerald-500/40 bg-slate-900/80 px-3 py-1.5 text-xs text-emerald-50 outline-none focus:border-emerald-300"
        >
          <option value="">No linked reward</option>
          {rewardOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
              {opt.sourceApp ? ` · ${opt.sourceApp}` : ""}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-emerald-300/80">
          If set, BitGalaxy can auto-issue this RewardCircle benefit
          when XP hits the threshold.
        </p>
      </div>

      {/* Remove */}
      {onRemove && (
        <div className="mt-2 flex justify-end md:mt-0 md:w-16">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-red-500/60 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-900/60"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default RewardMapRow;