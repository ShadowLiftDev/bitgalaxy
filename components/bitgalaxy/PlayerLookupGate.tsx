"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlayerLookupGateProps = {
  orgId: string;

  /**
   * Where to send the member once a canonical memberId is resolved.
   * Example: "/bitgalaxy" or "/bitgalaxy/games"
   */
  redirectBase?: string;

  /**
   * NeonHQ destination used when no existing OwnerOptics member can be found.
   *
   * BitGalaxy does not create members or expose a join flow directly.
   * The member must join the organization through NeonHQ.
   */
  joinRedirectUrl?: string;

  /**
   * Optional override for the NeonHQ join CTA.
   *
   * Default:
   * "Join {orgId} to earn XP"
   */
  joinCtaLabel?: string;
};

type LookupMode = "email" | "phone";

type LookupResponse = {
  success?: boolean;
  memberId?: string;
  userId?: string;
  code?: string;
  error?: string;
};

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

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function getFriendlyOrgLabel(orgId: string) {
  return orgId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PlayerLookupGate({
  orgId,
  redirectBase = "/bitgalaxy",
  joinRedirectUrl,
  joinCtaLabel,
}: PlayerLookupGateProps) {
  const router = useRouter();

  const normalizedOrgId = orgId.trim();
  const orgLabel = getFriendlyOrgLabel(normalizedOrgId);

  const resolvedJoinCtaLabel =
    joinCtaLabel?.trim() ||
    `Join ${normalizedOrgId || "this organization"} to earn XP`;

  const [mode, setMode] = useState<LookupMode>("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleLookupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setNotFound(false);

    if (!normalizedOrgId) {
      setError("BitGalaxy could not determine which organization you entered.");
      return;
    }

    const payload: {
      orgId: string;
      email?: string;
      phone?: string;
    } = {
      orgId: normalizedOrgId,
    };

    if (mode === "email") {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        setError("Enter the email connected to your member profile.");
        return;
      }

      payload.email = normalizedEmail;
    } else {
      const normalizedPhone = phone.trim();

      if (!normalizedPhone) {
        setError("Enter the phone number connected to your member profile.");
        return;
      }

      payload.phone = normalizedPhone;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bitgalaxy/lookup-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = (await response
        .json()
        .catch(() => ({}))) as LookupResponse;

      /**
       * Temporary compatibility:
       *
       * The doctrine-aligned API should return memberId.
       * userId remains accepted only until lookup-player/route.ts is refactored.
       */
      const memberId = json.memberId ?? json.userId;

      if (response.ok && json.success && memberId) {
        router.push(
          withParams(redirectBase, {
            orgId: normalizedOrgId,
            memberId: String(memberId),
          }),
        );

        return;
      }

      if (
        response.status === 404 ||
        json.code === "MEMBER_NOT_FOUND" ||
        json.code === "PLAYER_NOT_FOUND"
      ) {
        setNotFound(true);
        return;
      }

      throw new Error(
        json.error ||
          "We couldn’t find a member connected to this location.",
      );
    } catch (lookupError: unknown) {
      console.error("BitGalaxy member lookup failed:", lookupError);

      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "We couldn’t find a member connected to this location.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-500/50 bg-slate-950/85 p-5 shadow-[0_0_36px_rgba(56,189,248,0.5)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.22)_0,_transparent_55%)]"
      />

      <div className="relative space-y-4 text-xs text-sky-100">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            Member Access Gate
          </div>

          <h1 className="mt-2 text-base font-semibold text-sky-50">
            Connect your BitGalaxy progress
          </h1>

          <p className="text-[11px] text-sky-200/85">
            Use the phone number or email connected to your OwnerOptics member
            profile. We’ll load your BitGalaxy progress for this location.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-sky-500/40 bg-slate-950/80 p-1 text-[11px] text-sky-200">
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setError(null);
              setNotFound(false);
            }}
            className={
              "rounded-full px-3 py-1.5 transition " +
              (mode === "phone"
                ? "bg-sky-500 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.6)]"
                : "text-sky-300 hover:bg-slate-900")
            }
          >
            Phone
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("email");
              setError(null);
              setNotFound(false);
            }}
            className={
              "rounded-full px-3 py-1.5 transition " +
              (mode === "email"
                ? "bg-sky-500 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.6)]"
                : "text-sky-300 hover:bg-slate-900")
            }
          >
            Email
          </button>
        </div>

        <form
          onSubmit={handleLookupSubmit}
          className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/90 p-4"
        >
          {mode === "email" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="bitgalaxy-member-email"
                className="text-[11px] font-medium text-sky-200"
              >
                Email address
              </label>

              <input
                id="bitgalaxy-member-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/60 focus:border-sky-300"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="bitgalaxy-member-phone"
                className="text-[11px] font-medium text-sky-200"
              >
                Phone number
              </label>

              <input
                id="bitgalaxy-member-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-xs text-sky-50 outline-none placeholder:text-sky-400/60 focus:border-sky-300"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-[11px] text-rose-300">
              {error}
            </p>
          )}

          {notFound && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-[11px] text-amber-100">
                We couldn’t find a member connected to this location.
              </p>

              <p className="mt-1 text-[10px] text-amber-200/80">
                Join through NeonHQ first, then return here to begin earning
                BitGalaxy XP.
              </p>

              {joinRedirectUrl ? (
                isExternalUrl(joinRedirectUrl) ? (
                  <a
                    href={joinRedirectUrl}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.55)] transition hover:bg-amber-300"
                  >
                    {resolvedJoinCtaLabel}
                  </a>
                ) : (
                  <Link
                    href={joinRedirectUrl}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.55)] transition hover:bg-amber-300"
                  >
                    {resolvedJoinCtaLabel}
                  </Link>
                )
              ) : (
                <p className="mt-2 text-[10px] text-amber-200/80">
                  The NeonHQ join destination has not been configured for this
                  world.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Locating member…" : "Connect my progress"}
            </button>

            <p className="text-[10px] text-sky-400/80">
              Current world:{" "}
              <span className="font-semibold text-sky-200">
                {orgLabel || normalizedOrgId}
              </span>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}