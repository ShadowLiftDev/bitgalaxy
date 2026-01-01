"use client";

import { useState } from "react";

type CheckinPanelProps = {
  orgId: string;
  userId: string;
};

type CheckinResult = {
  questId?: string | null;
  xpAwarded: number;
  source: "quest_checkin" | "config_checkin" | "none" | string;
};

export function CheckinPanel({ orgId, userId }: CheckinPanelProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter your check-in code first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bitgalaxy/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          userId,
          code: trimmed,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Check-in failed.");
      }

      setResult(json.result as CheckinResult);
      setCode("");
    } catch (err: any) {
      console.error("Check-in error:", err);
      setError(err?.message || "Something went wrong while checking in.");
    } finally {
      setLoading(false);
    }
  }

  function renderResult() {
    if (!result) return null;

    const { xpAwarded, questId, source } = result;

    let headline = "";
    if (xpAwarded > 0 && source === "quest_checkin") {
      headline = "Quest check-in complete!";
    } else if (xpAwarded > 0 && source === "config_checkin") {
      headline = "Check-in successful!";
    } else {
      headline = "No XP awarded for this check-in.";
    }

    return (
      <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-4 text-sm text-emerald-100">
        <p className="font-semibold text-emerald-200">{headline}</p>
        <div className="mt-2 space-y-1 text-xs text-emerald-100/90">
          <p>
            XP awarded:{" "}
            <span className="font-semibold text-emerald-300">
              {xpAwarded}
            </span>
          </p>
          <p>
            Source:{" "}
            <span className="font-mono text-emerald-200">{source}</span>
          </p>
          {questId && (
            <p>
              Quest ID:{" "}
              <span className="font-mono text-emerald-200">{questId}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-sky-500/40 bg-slate-950/70 p-5">
      <h2 className="text-sm font-semibold text-sky-100">
        Check In & Earn XP
      </h2>
      <p className="mt-1 text-xs text-sky-200/80">
        Enter the check-in code shown at the venue. Your XP and quests will
        update automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your check-in code"
            className="flex-1 rounded-lg border border-sky-500/40 bg-slate-900/80 px-3 py-2 text-sm text-sky-50 outline-none placeholder:text-sky-400/50 focus:border-sky-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
          >
            {loading ? "Checking in..." : "Check In"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-300">
            {error}
          </p>
        )}
      </form>

      {/* QR scanning can be added later */}
      <p className="mt-3 text-[11px] text-sky-300/70">
        QR scanning support will be added soon. For now, use the code printed on
        the check-in display.
      </p>

      {renderResult()}
    </section>
  );
}