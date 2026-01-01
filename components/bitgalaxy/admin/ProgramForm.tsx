"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ProgramFormMode = "create" | "edit";

type LocalTimestampLike =
  | Date
  | { toDate?: () => Date }
  | null
  | undefined;

export interface ProgramFormProps {
  orgId: string;
  mode: ProgramFormMode;
  programId?: string;
  initialData?: {
    name?: string;
    description?: string;
    startAt?: LocalTimestampLike;
    endAt?: LocalTimestampLike;
    isActive?: boolean;
    xpMultiplier?: number;
    displayOrder?: number;
  };
}

function tsToLocalInput(ts?: LocalTimestampLike): string {
  if (!ts) return "";

  let d: Date | null = null;

  if (ts instanceof Date) {
    d = ts;
  } else if (typeof ts === "object" && ts.toDate) {
    d = ts.toDate();
  }

  if (!d) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export function ProgramForm({
  orgId,
  mode,
  programId,
  initialData,
}: ProgramFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [startAt, setStartAt] = useState(
    tsToLocalInput(initialData?.startAt),
  );
  const [endAt, setEndAt] = useState(
    tsToLocalInput(initialData?.endAt),
  );
  const [isActive, setIsActive] = useState(
    initialData?.isActive ?? true,
  );
  const [xpMultiplier, setXpMultiplier] = useState(
    typeof initialData?.xpMultiplier === "number"
      ? initialData.xpMultiplier
      : 1,
  );
  const [displayOrder, setDisplayOrder] = useState(
    typeof initialData?.displayOrder === "number"
      ? initialData.displayOrder
      : 0,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Program name is required");
      return;
    }

    const xpMult = Number(xpMultiplier);
    if (Number.isNaN(xpMult) || xpMult <= 0) {
      setError("XP multiplier must be a positive number");
      return;
    }

    const displayOrd = Number(displayOrder || 0);
    if (Number.isNaN(displayOrd)) {
      setError("Display order must be a number");
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? `/api/hq/${encodeURIComponent(orgId)}/bitgalaxy/programs/create`
          : `/api/hq/${encodeURIComponent(orgId)}/bitgalaxy/programs/update`;

      const body: any = {
        name: name.trim(),
        description: description.trim(),
        startAt: startAt || null, // backend can convert to Timestamp
        endAt: endAt || null,
        isActive,
        xpMultiplier: xpMult,
        displayOrder: displayOrd,
      };

      if (mode === "edit") {
        body.programId = programId;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save program");
      }

      setSuccess(
        mode === "create"
          ? "Program created successfully"
          : "Program updated successfully",
      );

      setTimeout(() => {
        router.push(`/hq/${encodeURIComponent(orgId)}/bitgalaxy/programs`);
        router.refresh();
      }, 600);
    } catch (err: any) {
      console.error("Program save failed:", err);
      setError(err?.message ?? "Failed to save program");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-sky-500/40 bg-slate-950/80 p-5 text-xs text-sky-100"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-sky-100">
            {mode === "create" ? "Create Program / Season" : "Edit Program"}
          </h2>
          <p className="mt-1 text-[11px] text-sky-300/80">
            Group quests into themed seasons or campaigns with bonus XP.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
            placeholder="Example: Neon Season 1 – Launch Arc"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">Status</label>
          <select
            value={isActive ? "active" : "inactive"}
            onChange={(e) => setIsActive(e.target.value === "active")}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-sky-300/90">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
          placeholder="Explain the theme, goals, or special bonuses for this season."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">
            Start time (optional)
          </label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">
            End time (optional)
          </label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">
            XP Multiplier
          </label>
          <input
            type="number"
            step="0.1"
            min={0.1}
            value={xpMultiplier}
            onChange={(e) => setXpMultiplier(Number(e.target.value))}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          />
          <p className="mt-1 text-[10px] text-sky-400/80">
            1 = normal XP, 1.5 = 50% bonus XP, 2 = double XP.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-sky-300/90">
          Display order (optional)
        </label>
        <input
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(Number(e.target.value))}
          className="w-full max-w-[200px] rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
        />
        <p className="mt-1 text-[10px] text-sky-400/80">
          Lower numbers appear first in lists.
        </p>
      </div>

      {error && (
        <p className="text-[11px] text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="text-[11px] text-emerald-300">
          {success}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            router.push(
              `/hq/${encodeURIComponent(orgId)}/bitgalaxy/programs`,
            );
          }}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-sky-200 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create program"
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default ProgramForm;