"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SignalLockGameProps = {
  orgId: string;
  userId: string;
};

export function SignalLockGame({ orgId, userId }: SignalLockGameProps) {
  const router = useRouter();

  const [stability, setStability] = useState(0);
  const [taps, setTaps] = useState(0);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gentle decay over time to make it feel alive
  useEffect(() => {
    decayIntervalRef.current = setInterval(() => {
      setStability((prev) => {
        // if locked, or already at 0, no decay
        if (prev <= 0 || locked) return prev;
        return Math.max(0, prev - 2); // small decay
      });
    }, 800);

    return () => {
      if (decayIntervalRef.current) clearInterval(decayIntervalRef.current);
    };
  }, [locked]);

  function handleTap() {
    // No tapping if we've already locked or we’re syncing
    if (locked || submitting) return;

    setError(null);
    setTaps((prev) => prev + 1);
    setStability((prev) => {
      // Each tap adds a random chunk for a more organic feel
      const increment = 10 + Math.floor(Math.random() * 12); // 10–21
      const next = Math.min(100, prev + increment);

      if (next >= 100) {
        // We just locked the signal
        setLocked(true);
      }

      return next;
    });
  }

  async function handleComplete() {
    // Only allow completion if we’re actually locked and not already syncing
    if (!locked || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bitgalaxy/quests/complete-signal-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          userId,
          questId: "signal-lock",
        }),
      });

      if (!res.ok) {
        // Special case: backend says this quest is already done
        if (res.status === 409) {
          setError(
            "This Signal Lock tutorial was already completed for this player. Your XP is already synced to this world."
          );
        } else {
          let message = "We locked your signal locally, but couldn’t sync with the server.";
          try {
            const data = await res.json();
            if (data?.error) {
              message = data.error;
            }
          } catch {
            // ignore json parse error, fall back to default message
          }
          setError(message);
        }
      }
    } catch (err: any) {
      console.error(
        "Signal Lock completion request failed (non-blocking):",
        err,
      );
      setError(
        "We locked your signal locally, but couldn’t sync with the server. Staff can still verify your progress.",
      );
    } finally {
      setSubmitting(false);
      // Either way, we let them move on to their dashboard
      router.push(`/bitgalaxy?userId=${encodeURIComponent(userId)}`);
    }
  }

  const progressLabel = locked
    ? "Signal locked"
    : stability >= 70
    ? "Signal stabilizing"
    : stability >= 30
    ? "Signal strengthening"
    : "Signal weak";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-slate-950/85 p-5 text-xs text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.55)]">
      {/* holo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25)_0,_transparent_55%)]"
      />

      <div className="relative space-y-4">
        {/* HEADER */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
              Tutorial · Signal Lock
            </div>
            <h2 className="mt-2 text-sm font-semibold text-emerald-50">
              Stabilize your BitGalaxy signal
            </h2>
            <p className="text-[11px] text-emerald-100/85">
              Tap to send calibration bursts into the grid. Fill the stability
              meter to 100% to lock your signal to this world and earn{" "}
              <span className="font-semibold text-emerald-200">50 XP</span>.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/40 bg-slate-950/95 px-3 py-2 text-[11px] text-emerald-200">
            <div className="font-mono text-[10px] text-emerald-300/80">
              orgs/{orgId}
            </div>
            <div className="mt-1 text-[10px] text-emerald-300/80">
              Player: <span className="font-mono">{userId}</span>
            </div>
          </div>
        </div>

        {/* STABILITY BAR */}
        <div className="space-y-2 rounded-2xl border border-emerald-500/40 bg-slate-950/95 p-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-emerald-200">
              Signal stability
            </span>
            <span className="text-emerald-300/85">
              {stability}% · {progressLabel}
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-900/90">
            <div
              className={
                "h-full rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)] " +
                (locked ? "bg-emerald-400" : "bg-sky-400")
              }
              style={{ width: `${Math.min(stability, 100)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-300/80">
            <span>Taps sent: {taps}</span>
            <span>
              Status:{" "}
              <span className="font-semibold">
                {locked ? "LOCKED" : "CALIBRATING"}
              </span>
            </span>
          </div>
        </div>

        {/* TAP AREA */}
        <button
          type="button"
          onClick={handleTap}
          disabled={locked || submitting}
          className={
            "mt-1 flex h-40 w-full flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center text-xs transition " +
            (locked
              ? "cursor-default border-emerald-500/60 bg-emerald-500/20 text-emerald-50 shadow-[0_0_30px_rgba(16,185,129,0.7)]"
              : "border-sky-500/60 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-sky-100 shadow-[0_0_26px_rgba(56,189,248,0.6)] hover:border-sky-300/80 hover:shadow-[0_0_32px_rgba(56,189,248,0.85)]")
          }
        >
          {locked ? (
            <>
              <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                Signal Locked
              </div>
              <div className="text-sm font-semibold text-emerald-50">
                You&apos;re now synced to this world.
              </div>
              <p className="mt-1 max-w-xs text-[11px] text-emerald-200/85">
                Your calibration is complete. You&apos;re clear to enter the
                BitGalaxy mission console and start taking on real contracts.
              </p>
            </>
          ) : (
            <>
              <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-sky-300">
                Tap to stabilize
              </div>
              <div className="text-sm font-semibold text-sky-50">
                Tap anywhere in this field to fire a calibration burst.
              </div>
              <p className="mt-1 max-w-xs text-[11px] text-sky-200/85">
                Each tap sends a pulse into the grid and increases your
                stability. Keep tapping until the bar hits 100% to complete the
                Signal Lock tutorial.
              </p>
            </>
          )}
        </button>

        {/* ERROR + COMPLETE CTA */}
        {error && (
          <p className="text-[11px] text-rose-300">
            {error}
          </p>
        )}

        {locked && (
          <div className="flex flex-col gap-2 pt-1 text-[11px] text-emerald-200/85 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Tutorial complete. You&apos;ve earned{" "}
              <span className="font-semibold text-emerald-100">50 XP</span> in
              the Signal Lock quest.
            </p>
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Syncing & opening dashboard…"
                : "Enter mission console"}
            </button>
          </div>
        )}

        {!locked && (
          <p className="pt-1 text-[10px] text-emerald-300/75">
            This is a one-time tutorial quest in most worlds. Staff can
            optionally reset it for special events or new seasons.
          </p>
        )}
      </div>
    </section>
  );
}