"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getClientDb } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { QuestCard } from "@/components/bitgalaxy/QuestCard";

type TabKey = "active" | "available" | "side";

type Quest = {
  id: string;
  type: string;
  xp: number;
  title: string;
  description?: string;
  [key: string]: any;
};

type Player = {
  activeQuestIds?: string[];
  completedQuestIds?: string[];
  displayName?: string;
  name?: string;
  [key: string]: any;
};

type QuestsClientShellProps = {
  orgId: string;
  tab: TabKey;
  quests: Quest[];
};

export default function QuestsClientShell({
  orgId,
  tab,
  quests,
}: QuestsClientShellProps) {
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  // Load BitGalaxy player doc for the signed-in Firebase user
  useEffect(() => {
    if (!user) {
      setPlayer(null);
      return;
    }

    async function loadPlayer() {
      setPlayerLoading(true);
      try {
        const db = getClientDb();
        const ref = doc(db, "orgs", orgId, "bitgalaxyPlayers", user.uid);
        const snap = await getDoc(ref);
        setPlayer(snap.exists() ? (snap.data() as Player) : null);
      } finally {
        setPlayerLoading(false);
      }
    }

    loadPlayer();
  }, [orgId, user]);

  const userId = user?.uid ?? null;

  const activeIds = new Set(player?.activeQuestIds ?? []);
  const completedIds = new Set(player?.completedQuestIds ?? []);

  const sideQuests = quests.filter((q) => q.type === "arcade");
  const nonSide = quests.filter((q) => q.type !== "arcade");

  const activeQuests = user ? nonSide.filter((q) => activeIds.has(q.id)) : [];
  const availableQuests = user
    ? nonSide.filter((q) => !activeIds.has(q.id) && !completedIds.has(q.id))
    : nonSide;

  const completedCount = user
    ? nonSide.filter((q) => completedIds.has(q.id)).length
    : 0;

  function tabHref(next: TabKey) {
    const sp = new URLSearchParams();
    sp.set("orgId", orgId);
    sp.set("tab", next);
    return `/bitgalaxy/quests?${sp.toString()}`;
  }

  const shown =
    tab === "active"
      ? activeQuests
      : tab === "side"
      ? sideQuests
      : availableQuests;

  const heading =
    tab === "active"
      ? "Active Quests"
      : tab === "side"
      ? "Side Quests"
      : "Available Quests";

  const subcopy =
    tab === "active"
      ? "Your current contracts. Finish these to stack weekly XP and climb."
      : tab === "side"
      ? "Arcade missions: quick hits, fast XP, and score bragging rights."
      : "Pick your next contract. Lock it in, then route your XP.";

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <section className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25)_0,_transparent_55%),linear-gradient(120deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.92)_40%,rgba(15,23,42,0.92)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                Contract Selector
              </div>

              <h2 className="mt-2 text-lg font-semibold text-sky-50">
                {heading}
              </h2>
              <p className="text-xs text-sky-100/80">{subcopy}</p>

              {!user && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
                  Sign in to track{" "}
                  <span className="font-semibold">Active</span>,{" "}
                  <span className="font-semibold">Completed</span>, and your XP.
                  <div className="mt-2">
                    <Link
                      href="/bitgalaxy"
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/15"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      Sign in
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right text-[11px] text-sky-200/85">
              <p>
                {quests.length} quest{quests.length === 1 ? "" : "s"} online
              </p>
              {user && (
                <p className="mt-0.5 text-[10px] text-sky-200/65">
                  {activeQuests.length} active • {availableQuests.length} available •{" "}
                  {completedCount} completed
                </p>
              )}

              <div className="mt-3 inline-flex overflow-hidden rounded-full border border-sky-500/30 bg-slate-950/70 text-[11px]">
                <Link
                  href={tabHref("active")}
                  className={`px-3 py-1.5 ${
                    tab === "active"
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-sky-200/80 hover:bg-white/5"
                  }`}
                >
                  Active
                </Link>
                <Link
                  href={tabHref("available")}
                  className={`px-3 py-1.5 ${
                    tab === "available"
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-sky-200/80 hover:bg-white/5"
                  }`}
                >
                  Available
                </Link>
                <Link
                  href={tabHref("side")}
                  className={`px-3 py-1.5 ${
                    tab === "side"
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-sky-200/80 hover:bg-white/5"
                  }`}
                >
                  Side Quests
                </Link>
              </div>
            </div>
          </header>

          {shown.length === 0 ? (
            <div className="mt-2 rounded-xl border border-sky-500/40 bg-slate-950/95 px-4 py-4 text-xs text-sky-100/85">
              <p className="font-medium text-sky-100">
                {tab === "active"
                  ? "No active contracts."
                  : tab === "side"
                  ? "No arcade missions are online yet."
                  : "No contracts posted yet."}
              </p>
              <p className="mt-1 text-sky-200/85">
                {tab === "active"
                  ? "Start a quest from Available to see it appear here."
                  : "Once quests are configured, they’ll populate here."}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex gap-3 overflow-x-auto pb-2 pr-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
                {shown.map((quest) => {
                  const gamePath =
                    (quest as any).gamePath ||
                    (quest as any).meta?.gamePath ||
                    null;

                  const playHref =
                    gamePath && user
                      ? `${gamePath}?orgId=${encodeURIComponent(
                          orgId,
                        )}&userId=${encodeURIComponent(user.uid)}`
                      : null;

                  return (
                    <div
                      key={quest.id}
                      className="snap-start shrink-0 w-[280px] sm:w-[340px] md:w-[380px]"
                    >
                      <QuestCard
                        quest={quest}
                        orgId={orgId}
                        variant="carousel"
                        status={
                          user
                            ? completedIds.has(quest.id)
                              ? "completed"
                              : activeIds.has(quest.id)
                              ? "active"
                              : "available"
                            : "available"
                        }
                      />

                      {/* Start / Play button for quests wired to a game */}
                      {gamePath && (
                        <div className="mt-2 flex justify-end">
                          <Link
                            href={
                              user
                                ? (playHref as string)
                                : "/login"
                            }
                            className={`inline-flex items-center justify-center rounded-full border border-sky-500/60 px-3 py-1.5 text-[11px] font-semibold ${
                              user
                                ? "bg-sky-500/15 text-sky-100 hover:bg-sky-500/25"
                                : "bg-slate-700/60 text-sky-100 hover:bg-slate-600/80"
                            }`}
                          >
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                            {user ? "Start mission" : "Sign in to play"}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-[10px] text-sky-200/60">
                Tip: swipe left/right on mobile. On desktop, scroll horizontally.
              </p>
            </div>
          )}

          {playerLoading && user && (
            <p className="text-[10px] text-sky-300/70">
              Syncing your contracts…
            </p>
          )}
        </div>
      </section>
    </div>
  );
}