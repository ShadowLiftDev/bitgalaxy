"use client";

import { useState } from "react";

export interface BitGalaxySettingsInitial {
  enabled: boolean;
  theme: string;
  xpPerCheckin: number;
  defaultProgramId: string | null;
}

interface BitGalaxySettingsFormProps {
  orgId: string;
  initial: BitGalaxySettingsInitial;
}

const THEMES = ["neon", "retro", "cyber"];

export function BitGalaxySettingsForm({
  orgId,
  initial,
}: BitGalaxySettingsFormProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [theme, setTheme] = useState(initial.theme || "neon");
  const [xpPerCheckin, setXpPerCheckin] = useState(
    initial.xpPerCheckin ?? 0,
  );
  const [defaultProgramId, setDefaultProgramId] = useState(
    initial.defaultProgramId ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const xpValue = Number(xpPerCheckin);
    if (Number.isNaN(xpValue) || xpValue < 0) {
      setError("XP per check-in must be a non-negative number");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/hq/${encodeURIComponent(orgId)}/bitgalaxy/settings/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            theme,
            xpPerCheckin: xpValue,
            defaultProgramId: defaultProgramId.trim() || null,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update settings");
      }

      setSuccess("Settings updated successfully");
    } catch (err: any) {
      console.error("Settings update failed:", err);
      setError(err?.message ?? "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-sky-500/40 bg-slate-950/80 p-5 text-xs text-sky-100"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">
            BitGalaxy status
          </label>
          <select
            value={enabled ? "enabled" : "disabled"}
            onChange={(e) => setEnabled(e.target.value === "enabled")}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <p className="mt-1 text-[10px] text-sky-400/80">
            When disabled, player-facing BitGalaxy pages can be hidden or
            limited.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-sky-400/80">
            Controls the visual flavor for BitGalaxy UI in this world.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-sky-300/90">
            XP per check-in (fallback)
          </label>
          <input
            type="number"
            min={0}
            value={xpPerCheckin}
            onChange={(e) => setXpPerCheckin(Number(e.target.value))}
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
          />
          <p className="mt-1 text-[10px] text-sky-400/80">
            Used when players check in but no specific check-in quest is
            matched.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-sky-300/90">
          Default program (optional)
        </label>
        <input
          value={defaultProgramId}
          onChange={(e) => setDefaultProgramId(e.target.value)}
          placeholder="Program ID or leave blank"
          className="w-full max-w-md rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
        />
        <p className="mt-1 text-[10px] text-sky-400/80">
          New players and default check-ins can be associated with this program
          if set.
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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}