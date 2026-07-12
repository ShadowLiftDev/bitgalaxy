"use client";

import { useState } from "react";

export type BitGalaxyStatus =
  | "active"
  | "inactive";

export type BitGalaxyTheme =
  | "neon"
  | "retro"
  | "cyber";

export interface BitGalaxySettingsInitial {
  status: BitGalaxyStatus;
  theme: BitGalaxyTheme;

  allowPublicAccess: boolean;
  allowPublicJoin: boolean;
  allowGuestMode: boolean;
  allowLeaderboard: boolean;

  worldName: string;
  publicHeadline: string;
  publicDescription: string;
  locationLabel: string;
  logoUrl: string;

  xpPerCheckin: number;
  defaultGameCompletionXp: number;
  defaultProgramId: string | null;
}

interface BitGalaxySettingsFormProps {
  orgId: string;
  initial: BitGalaxySettingsInitial;
}

type SaveResponse = {
  success?: boolean;
  error?: string;
  config?: Record<string, unknown>;
};

const THEMES: BitGalaxyTheme[] = [
  "neon",
  "retro",
  "cyber",
];

function normalizeNonNegativeInteger(
  value: number,
): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

export function BitGalaxySettingsForm({
  orgId,
  initial,
}: BitGalaxySettingsFormProps) {
  const normalizedOrgId = orgId.trim();

  const [status, setStatus] =
    useState<BitGalaxyStatus>(
      initial.status || "inactive",
    );

  const [theme, setTheme] =
    useState<BitGalaxyTheme>(
      initial.theme || "neon",
    );

  const [allowPublicAccess, setAllowPublicAccess] =
    useState(initial.allowPublicAccess);

  const [allowPublicJoin, setAllowPublicJoin] =
    useState(initial.allowPublicJoin);

  const [allowGuestMode, setAllowGuestMode] =
    useState(initial.allowGuestMode);

  const [allowLeaderboard, setAllowLeaderboard] =
    useState(initial.allowLeaderboard);

  const [worldName, setWorldName] = useState(
    initial.worldName || "",
  );

  const [publicHeadline, setPublicHeadline] =
    useState(initial.publicHeadline || "");

  const [
    publicDescription,
    setPublicDescription,
  ] = useState(
    initial.publicDescription || "",
  );

  const [locationLabel, setLocationLabel] =
    useState(initial.locationLabel || "");

  const [logoUrl, setLogoUrl] = useState(
    initial.logoUrl || "",
  );

  const [xpPerCheckin, setXpPerCheckin] =
    useState(initial.xpPerCheckin ?? 0);

  const [
    defaultGameCompletionXp,
    setDefaultGameCompletionXp,
  ] = useState(
    initial.defaultGameCompletionXp ?? 50,
  );

  const [
    defaultProgramId,
    setDefaultProgramId,
  ] = useState(
    initial.defaultProgramId ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!normalizedOrgId) {
      setError(
        "BitGalaxy could not determine the organization.",
      );
      return;
    }

    const normalizedWorldName = worldName.trim();

    if (!normalizedWorldName) {
      setError("World name is required.");
      return;
    }

    const normalizedXpPerCheckin =
      normalizeNonNegativeInteger(
        Number(xpPerCheckin),
      );

    if (normalizedXpPerCheckin === null) {
      setError(
        "XP per check-in must be a non-negative whole number.",
      );
      return;
    }

    const normalizedGameXp =
      normalizeNonNegativeInteger(
        Number(defaultGameCompletionXp),
      );

    if (normalizedGameXp === null) {
      setError(
        "Default game completion XP must be a non-negative whole number.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/hq/${encodeURIComponent(
          normalizedOrgId,
        )}/bitgalaxy/settings/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status,
            theme,

            allowPublicAccess,
            allowPublicJoin,
            allowGuestMode,
            allowLeaderboard,

            worldName: normalizedWorldName,
            publicHeadline:
              publicHeadline.trim(),
            publicDescription:
              publicDescription.trim(),
            locationLabel:
              locationLabel.trim(),
            logoUrl: logoUrl.trim(),

            xpPerCheckin:
              normalizedXpPerCheckin,
            defaultGameCompletionXp:
              normalizedGameXp,
            defaultProgramId:
              defaultProgramId.trim() || null,
          }),
        },
      );

      const json = (await response
        .json()
        .catch(() => ({}))) as SaveResponse;

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ||
            "Failed to update BitGalaxy settings.",
        );
      }

      setSuccess(
        "BitGalaxy configuration updated successfully.",
      );
    } catch (saveError: unknown) {
      console.error(
        "BitGalaxy settings update failed:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update BitGalaxy settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-sky-500/40 bg-slate-950/80 p-5 text-xs text-sky-100"
    >
      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400/80">
            Module access
          </p>

          <h2 className="mt-1 text-sm font-semibold text-sky-50">
            BitGalaxy availability
          </h2>

          <p className="mt-1 text-[10px] text-sky-300/75">
            Control whether this organization has an
            active, publicly accessible BitGalaxy world.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label
              htmlFor="bitgalaxy-status"
              className="text-[11px] text-sky-300/90"
            >
              Module status
            </label>

            <select
              id="bitgalaxy-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as BitGalaxyStatus,
                )
              }
              className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="bitgalaxy-theme"
              className="text-[11px] text-sky-300/90"
            >
              Theme
            </label>

            <select
              id="bitgalaxy-theme"
              value={theme}
              onChange={(event) =>
                setTheme(
                  event.target
                    .value as BitGalaxyTheme,
                )
              }
              className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
            >
              {THEMES.map((themeOption) => (
                <option
                  key={themeOption}
                  value={themeOption}
                >
                  {themeOption}
                </option>
              ))}
            </select>
          </div>

          <BooleanSelect
            id="bitgalaxy-public-access"
            label="Public access"
            value={allowPublicAccess}
            onChange={setAllowPublicAccess}
            enabledLabel="Allowed"
            disabledLabel="Private"
          />

          <BooleanSelect
            id="bitgalaxy-public-join"
            label="Public join"
            value={allowPublicJoin}
            onChange={setAllowPublicJoin}
            enabledLabel="Allowed"
            disabledLabel="Disabled"
          />

          <BooleanSelect
            id="bitgalaxy-guest-mode"
            label="Guest mode"
            value={allowGuestMode}
            onChange={setAllowGuestMode}
            enabledLabel="Allowed"
            disabledLabel="Disabled"
          />

          <BooleanSelect
            id="bitgalaxy-leaderboard"
            label="Leaderboard"
            value={allowLeaderboard}
            onChange={setAllowLeaderboard}
            enabledLabel="Visible"
            disabledLabel="Hidden"
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-sky-500/20 pt-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300/80">
            Public world identity
          </p>

          <h2 className="mt-1 text-sm font-semibold text-violet-50">
            World display
          </h2>

          <p className="mt-1 text-[10px] text-violet-200/70">
            These values appear in the BitGalaxy
            world selector and public games experience.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="bitgalaxy-world-name"
            label="World name"
            value={worldName}
            onChange={setWorldName}
            placeholder="Organization or world name"
            required
          />

          <TextField
            id="bitgalaxy-location-label"
            label="Location label"
            value={locationLabel}
            onChange={setLocationLabel}
            placeholder="City, State"
          />

          <TextField
            id="bitgalaxy-public-headline"
            label="Public headline"
            value={publicHeadline}
            onChange={setPublicHeadline}
            placeholder="Enter the arcade."
          />

          <TextField
            id="bitgalaxy-logo-url"
            label="Logo URL"
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://..."
            type="url"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="bitgalaxy-public-description"
            className="text-[11px] text-violet-200/90"
          >
            Public description
          </label>

          <textarea
            id="bitgalaxy-public-description"
            value={publicDescription}
            onChange={(event) =>
              setPublicDescription(
                event.target.value,
              )
            }
            rows={4}
            placeholder="Describe the BitGalaxy experience available in this world."
            className="w-full rounded-lg border border-violet-500/40 bg-slate-950/80 px-3 py-2 text-xs text-violet-50 outline-none placeholder:text-violet-400/45 focus:border-violet-300"
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-sky-500/20 pt-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            Progression defaults
          </p>

          <h2 className="mt-1 text-sm font-semibold text-emerald-50">
            XP configuration
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            id="bitgalaxy-xp-checkin"
            label="XP per check-in"
            value={xpPerCheckin}
            onChange={setXpPerCheckin}
          />

          <NumberField
            id="bitgalaxy-default-game-xp"
            label="Default game completion XP"
            value={defaultGameCompletionXp}
            onChange={
              setDefaultGameCompletionXp
            }
          />

          <TextField
            id="bitgalaxy-default-program"
            label="Default program"
            value={defaultProgramId}
            onChange={setDefaultProgramId}
            placeholder="Program ID or leave blank"
          />
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"
        >
          {success}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : "Save BitGalaxy settings"}
        </button>
      </div>
    </form>
  );
}

type BooleanSelectProps = {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
};

function BooleanSelect({
  id,
  label,
  value,
  onChange,
  enabledLabel,
  disabledLabel,
}: BooleanSelectProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] text-sky-300/90"
      >
        {label}
      </label>

      <select
        id={id}
        value={value ? "true" : "false"}
        onChange={(event) =>
          onChange(event.target.value === "true")
        }
        className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none focus:border-sky-300"
      >
        <option value="true">
          {enabledLabel}
        </option>

        <option value="false">
          {disabledLabel}
        </option>
      </select>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url";
};

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: TextFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] text-sky-300/90"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/45 focus:border-sky-300"
      />
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function NumberField({
  id,
  label,
  value,
  onChange,
}: NumberFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] text-emerald-200/90"
      >
        {label}
      </label>

      <input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full rounded-lg border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-emerald-50 outline-none focus:border-emerald-300"
      />
    </div>
  );
}