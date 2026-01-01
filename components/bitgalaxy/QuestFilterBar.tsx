"use client";

import { useCallback } from "react";

const QUEST_TYPES = [
  "checkin",
  "purchase",
  "photo",
  "referral",
  "visit",
  "custom",
] as const;

export type QuestType = (typeof QUEST_TYPES)[number];

export type QuestFilter = {
  search: string;
  type: QuestType | "all";
  status: "all" | "active" | "inactive";
  programId: string | "all";
};

type ProgramOption = {
  id: string;
  name: string;
};

type QuestFilterBarProps = {
  filter: QuestFilter;
  onChange: (next: QuestFilter) => void;

  /**
   * Optional list of programs/seasons for dropdown.
   * Usually from getPrograms(orgId).
   */
  programOptions?: ProgramOption[];
};

export function QuestFilterBar({
  filter,
  onChange,
  programOptions = [],
}: QuestFilterBarProps) {
  const handleFieldChange = useCallback(
    (patch: Partial<QuestFilter>) => {
      onChange({ ...filter, ...patch });
    },
    [filter, onChange],
  );

  const handleReset = () => {
    onChange({
      search: "",
      type: "all",
      status: "all",
      programId: "all",
    });
  };

  return (
    <section className="mb-4 rounded-xl border border-sky-500/40 bg-slate-950/80 p-4 text-xs text-sky-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-2">
          <label className="text-[11px] text-sky-300/90">
            Search quests
          </label>
          <input
            value={filter.search}
            onChange={(e) => handleFieldChange({ search: e.target.value })}
            placeholder="Search by title or description..."
            className="w-full rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
          />
          <p className="text-[10px] text-sky-400/80">
            Filter quests by name, purpose, or key phrases.
          </p>
        </div>

        <div className="grid flex-1 gap-3 md:max-w-xl md:grid-cols-3">
          {/* Type */}
          <div className="space-y-1">
            <label className="text-[11px] text-sky-300/90">
              Quest type
            </label>
            <select
              value={filter.type}
              onChange={(e) =>
                handleFieldChange({
                  type: e.target.value as QuestType | "all",
                })
              }
              className="w-full rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
            >
              <option value="all">All types</option>
              {QUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] text-sky-300/90">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) =>
                handleFieldChange({
                  status: e.target.value as QuestFilter["status"],
                })
              }
              className="w-full rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
            >
              <option value="all">All quests</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Program / Season */}
          <div className="space-y-1">
            <label className="text-[11px] text-sky-300/90">
              Program / Season
            </label>
            <select
              value={filter.programId}
              onChange={(e) =>
                handleFieldChange({
                  programId: e.target.value,
                })
              }
              className="w-full rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
            >
              <option value="all">All programs</option>
              {programOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-sky-400/80">
          Use filters to quickly find quests for specific campaigns, visit
          types, or referral pushes.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-slate-800"
        >
          Reset filters
        </button>
      </div>
    </section>
  );
}

export default QuestFilterBar;