"use client";

import { useState } from "react";
import Link from "next/link";

const ORG_DEMO_ID = "neon-lunchbox"; // change if your demo orgId differs

type TabId = "admin" | "player";

const TABS: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "admin", label: "Owner / Admin", eyebrow: "Design the galaxy" },
  { id: "player", label: "Player View", eyebrow: "What guests experience" },
];

export default function BitGalaxyDemoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("admin");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* cosmic gradient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.25)_0,_transparent_60%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.23)_0,_transparent_60%),radial-gradient(circle_at_center,_rgba(129,140,248,0.18)_0,_transparent_55%)]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-sky-300/80">
              BitGalaxy · Guided Demo
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Turn your{" "}
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                everyday visits
              </span>{" "}
              into an{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
                XP-powered galaxy
              </span>
              .
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-slate-300/90">
              Use the tabs below to walk through BitGalaxy from the perspective
              of an owner designing the world and the player leveling up across
              your universe.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/hq/${ORG_DEMO_ID}/bitgalaxy`}
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              Open NeonHQ BitGalaxy console
            </Link>
            <Link
              href="/bitgalaxy/checkin"
              className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900"
            >
              Open player check-in demo
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <nav className="inline-flex overflow-hidden rounded-full border border-slate-800 bg-slate-950/80 p-1 text-xs">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-4 py-1.5 rounded-full transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-200 hover:bg-slate-800 hover:text-slate-50",
                ].join(" ")}
              >
                <span className="block text-[10px] uppercase tracking-wide">
                  {tab.eyebrow}
                </span>
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <section className="space-y-4">
          {activeTab === "admin" && <AdminWalkthrough />}
          {activeTab === "player" && <PlayerWalkthrough />}
        </section>

        {/* Footer links */}
        <footer className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            BitGalaxy is the gamified XP engine inside the NeonHQ toolset.
          </span>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/hq/${ORG_DEMO_ID}/bitgalaxy`}
              className="hover:text-slate-100"
            >
              Open admin dashboard →
            </Link>
            <Link
              href="/bitgalaxy"
              className="hover:text-slate-100"
            >
              View player portal →
            </Link>
            <Link
              href="/login"
              className="hover:text-slate-100"
            >
              Owner login →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* -------------------- Admin walkthrough -------------------- */

function AdminWalkthrough() {
  const orgBase = `/hq/${ORG_DEMO_ID}/bitgalaxy`;

  const steps = [
    {
      step: "Step 1",
      title: "Open the BitGalaxy console",
      body: "Owners land on an overview showing active players, XP earned this week, and which quests are driving the most engagement.",
      href: orgBase,
      hrefLabel: "Open admin dashboard",
    },
    {
      step: "Step 2",
      title: "Define XP rules & tiers",
      body: "In Program Settings you set XP per visit, bonus rules for events, and tier thresholds for levels like Rookie, Maverick, and Legend.",
      href: `${orgBase}/settings`,
      hrefLabel: "Go to Program Settings",
    },
    {
      step: "Step 3",
      title: "Create programs & quests",
      body: "Use the Programs and Quests tabs to design missions: visit 3 times this week, bring a friend, complete a themed event night, and more.",
      href: `${orgBase}/quests`,
      hrefLabel: "Go to Quests",
    },
    {
      step: "Step 4",
      title: "Track leaderboard & analytics",
      body: "The Leaderboard and Analytics views show your top players, daily XP trends, and which quests are actually moving the needle.",
      href: `${orgBase}/analytics`,
      hrefLabel: "View analytics",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-50">Owner / Admin view</h2>
      <p className="text-xs text-slate-300">
        This is where you design the galaxy: XP rules, programs, quests, and
        the big-picture view of how players move through your universe.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <StepCard
            key={s.title}
            step={s.step}
            title={s.title}
            body={s.body}
            href={s.href}
            hrefLabel={s.hrefLabel}
            accent="sky"
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Player walkthrough -------------------- */

function PlayerWalkthrough() {
  const playerBase = `/bitgalaxy`;

  const steps = [
    {
      step: "Step 1",
      title: "Open the BitGalaxy player hub",
      body: "Guests see their avatar, current level, XP bar, and which worlds or locations they’ve unlocked so far.",
      href: playerBase,
      hrefLabel: "Open player hub (demo)",
    },
    {
      step: "Step 2",
      title: "Browse active quests",
      body: "The Quests view highlights missions they can complete tonight, this week, and across the entire Neon ecosystem.",
      href: `${playerBase}/quests`,
      hrefLabel: "View quests list",
    },
    {
      step: "Step 3",
      title: "Claim rewards & loot",
      body: "When they hit certain XP thresholds or finish quest chains, players can unlock rewards and perks through the redeem view.",
      href: `${playerBase}/redeem`,
      hrefLabel: "Preview rewards",
    },
    {
      step: "Step 4",
      title: "See their impact across worlds",
      body: "If you connect multiple venues, BitGalaxy shows XP and progress across all participating locations in a unified multi-world view.",
      href: `${playerBase}/worlds`,
      hrefLabel: "Preview multi-world view",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-50">Player view</h2>
      <p className="text-xs text-slate-300">
        This is what your guests feel: progress, discovery, and a reason to come
        back for “one more quest” instead of “one more night.”
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <StepCard
            key={s.title}
            step={s.step}
            title={s.title}
            body={s.body}
            href={s.href}
            hrefLabel={s.hrefLabel}
            accent="fuchsia"
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Shared StepCard -------------------- */

type AccentColor = "sky" | "indigo" | "fuchsia";

type StepCardProps = {
  step: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
  accent?: AccentColor;
};

function StepCard({
  step,
  title,
  body,
  href,
  hrefLabel,
  accent = "sky",
}: StepCardProps) {
  const accentClass =
    accent === "indigo"
      ? "text-indigo-300"
      : accent === "fuchsia"
      ? "text-fuchsia-300"
      : "text-sky-300";

  const linkClass =
    accent === "indigo"
      ? "text-indigo-300 hover:text-indigo-200"
      : accent === "fuchsia"
      ? "text-fuchsia-300 hover:text-fuchsia-200"
      : "text-sky-300 hover:text-sky-200";

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur">
      {/* Live preview / visual embed */}
      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
        {href ? (
          <iframe
            src={href}
            className="h-full w-full scale-[0.8] origin-top-left pointer-events-none"
            title={title}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
            Preview coming soon
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="space-y-1">
        <div
          className={`text-[11px] font-semibold uppercase tracking-wide ${accentClass}`}
        >
          {step}
        </div>
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-300">{body}</p>
      </div>

      {href && hrefLabel && (
        <div className="pt-1">
          <Link href={href} className={`text-[11px] font-medium ${linkClass}`}>
            {hrefLabel} →
          </Link>
        </div>
      )}
    </article>
  );
}