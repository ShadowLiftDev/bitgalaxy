"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { WorldCard } from "@/components/bitgalaxy/WorldCard";

export type BitGalaxyEntryWorld = {
  orgId: string;
  name: string;
  description?: string | null;
  locationLabel?: string | null;
  logoUrl?: string | null;
  guestModeEnabled: boolean;

  /**
   * Optional world-specific join destination.
   *
   * If absent, the component can construct a join URL from
   * ownerOpticsBaseUrl.
   */
  joinUrl?: string | null;
};

type BitGalaxyEntryGateProps = {
  worlds: BitGalaxyEntryWorld[];

  /**
   * A valid orgId supplied through the page URL can preselect a world.
   */
  initialOrgId?: string | null;

  /**
   * Where PlayerLookupGate redirects after resolving memberId.
   */
  redirectBase?: string;

  /**
   * Public OwnerOptics or NeonHQ base URL.
   *
   * Example:
   * https://neon-hq.vercel.app
   *
   * Prefer passing this from an environment variable in the server page.
   */
  ownerOpticsBaseUrl?: string | null;

  /**
   * Whether the entry screen should offer guest access.
   *
   * The selected world must also have guestModeEnabled=true.
   */
  allowGuestMode?: boolean;
};

function normalizeBaseUrl(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";

  return normalized || null;
}

function withParams(
  path: string,
  params: Record<string, string | undefined | null>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
}

export function BitGalaxyEntryGate({
  worlds,
  initialOrgId,
  redirectBase = "/bitgalaxy/games",
  ownerOpticsBaseUrl,
  allowGuestMode = true,
}: BitGalaxyEntryGateProps) {
  const normalizedInitialOrgId = initialOrgId?.trim() ?? "";

  const initialSelectedOrgId = useMemo(() => {
    const initialWorldExists = worlds.some(
      (world) => world.orgId === normalizedInitialOrgId,
    );

    if (initialWorldExists) {
      return normalizedInitialOrgId;
    }

    if (worlds.length === 1) {
      return worlds[0].orgId;
    }

    return "";
  }, [normalizedInitialOrgId, worlds]);

  const [selectedOrgId, setSelectedOrgId] = useState(
    initialSelectedOrgId,
  );

  const selectedWorld =
    worlds.find((world) => world.orgId === selectedOrgId) ?? null;

  const normalizedOwnerOpticsBaseUrl =
    normalizeBaseUrl(ownerOpticsBaseUrl);

  const joinRedirectUrl = selectedWorld
    ? selectedWorld.joinUrl?.trim() ||
      (normalizedOwnerOpticsBaseUrl
        ? `${normalizedOwnerOpticsBaseUrl}/orgs/${encodeURIComponent(
            selectedWorld.orgId,
          )}/join`
        : undefined)
    : undefined;

  if (worlds.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-100">
        <h1 className="text-base font-semibold text-amber-50">
          No BitGalaxy worlds are currently available
        </h1>

        <p className="mt-2 text-[11px] text-amber-200/85">
          No public organizations currently have an active BitGalaxy world.
          Please return later or enter through an organization’s direct link.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-violet-500/40 bg-slate-950/90 p-5 shadow-[0_0_34px_rgba(139,92,246,0.25)]">
        <div className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-violet-300/85">
            BitGalaxy · World Access
          </p>

          <h1 className="mt-1 text-lg font-semibold text-violet-50">
            Choose your world
          </h1>

          <p className="mt-2 text-[11px] text-violet-200/80">
            Select the organization whose BitGalaxy world you want to enter.
            Your phone number or email will then be checked against your
            membership in that world.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {worlds.map((world) => (
            <WorldCard
              key={world.orgId}
              orgId={world.orgId}
              name={world.name}
              description={world.description}
              locationLabel={world.locationLabel}
              logoUrl={world.logoUrl}
              selected={selectedOrgId === world.orgId}
              onSelect={(orgId) => {
                setSelectedOrgId(orgId);
              }}
            />
          ))}
        </div>
      </div>

      {!selectedWorld ? (
        <div className="rounded-2xl border border-sky-500/30 bg-slate-950/80 p-5 text-xs text-sky-100">
          <h2 className="font-semibold text-sky-50">
            Select a world to continue
          </h2>

          <p className="mt-1 text-[11px] text-sky-300/80">
            BitGalaxy needs a world selection before it can locate your member
            profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-emerald-300/80">
                Selected world
              </p>

              <p className="mt-0.5 font-semibold text-emerald-50">
                {selectedWorld.name}
              </p>

              {selectedWorld.locationLabel && (
                <p className="mt-0.5 text-[10px] text-emerald-200/75">
                  {selectedWorld.locationLabel}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrgId("")}
              className="self-start rounded-full border border-emerald-300/40 px-3 py-1.5 text-[10px] font-semibold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/10 sm:self-auto"
            >
              Change world
            </button>
          </div>

          <PlayerLookupGate
            orgId={selectedWorld.orgId}
            redirectBase={redirectBase}
            joinRedirectUrl={joinRedirectUrl}
            joinCtaLabel={`Join ${selectedWorld.name} to earn XP`}
          />

          {allowGuestMode && selectedWorld.guestModeEnabled && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 text-[11px] text-slate-300">
              <p>
                You can also enter this world as a guest. Guest runs do not
                save XP or official high scores.
              </p>

              <Link
                href={withParams(redirectBase, {
                  orgId: selectedWorld.orgId,
                  guest: "1",
                })}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-500/70 bg-slate-900 px-4 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-sky-400/80 hover:text-sky-100"
              >
                Enter {selectedWorld.name} as guest
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default BitGalaxyEntryGate;