"use client";

import { useState } from "react";

export function PlayerSettingsPanel() {
  const [soundOn, setSoundOn] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [showTips, setShowTips] = useState(true);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
      {/* holo wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.25)_0,_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.9)_40%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.98)_100%)]"
      />

      <div className="relative space-y-4">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
            Client Console
          </div>
          <h2 className="mt-2 text-lg font-semibold text-sky-50">
            Player Settings
          </h2>
          <p className="text-xs text-sky-100/80">
            Tune how BitGalaxy feels on this device. These preferences are
            local only for now, and will sync with your profile in a later
            update.
          </p>
        </header>

        <div className="mt-2 space-y-3 text-xs text-sky-100">
          <label className="flex items-start gap-3 rounded-xl border border-sky-500/35 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
            <input
              type="checkbox"
              checked={soundOn}
              onChange={(e) => setSoundOn(e.target.checked)}
              className="mt-[2px] h-3 w-3 accent-sky-500"
            />
            <div>
              <div className="font-semibold text-sky-50">
                Enable sound effects
              </div>
              <div className="mt-1 text-[11px] text-sky-300/80">
                Trigger subtle chimes and pulses on rank-ups, quest
                completions, and other key events.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-sky-500/35 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="mt-[2px] h-3 w-3 accent-sky-500"
            />
            <div>
              <div className="font-semibold text-sky-50">
                Email alerts (coming soon)
              </div>
              <div className="mt-1 text-[11px] text-sky-300/80">
                Opt-in for emails when new seasons launch or major quests go
                live. This toggle is cosmetic until NeonHQ hooks are wired.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-sky-500/35 bg-slate-950/90 p-3 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
            <input
              type="checkbox"
              checked={showTips}
              onChange={(e) => setShowTips(e.target.checked)}
              className="mt-[2px] h-3 w-3 accent-sky-500"
            />
            <div>
              <div className="font-semibold text-sky-50">
                Show gameplay tips
              </div>
              <div className="mt-1 text-[11px] text-sky-300/80">
                Surface short hints and optimization prompts on the dashboard
                about quests, streaks, and rewards.
              </div>
            </div>
          </label>
        </div>

        <p className="mt-2 text-[11px] text-sky-200/80">
          In a future player-profile pass, these preferences will be stored
          per user and travel with you across devices and BitGalaxy worlds.
        </p>
      </div>
    </section>
  );
}