"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { QuestDetail, type QuestStatus } from "@/components/bitgalaxy/QuestDetail";

type Quest = {
  id: string;
  title: string;
  description?: string;
  xp: number;
  type: string;
  coverImageUrl?: string;
  imageUrl?: string;
  media?: { imageUrl?: string };
  rules?: string[];
  levels?: any[];
  meta?: {
    rules?: string[];
    levels?: any[];
    gamePath?: string;
    [key: string]: any;
  };
  gamePath?: string;
  [key: string]: any;
};

type Player = {
  activeQuestIds?: string[];
  completedQuestIds?: string[];
  displayName?: string;
  name?: string;
  [key: string]: any;
};

type QuestDetailClientShellProps = {
  orgId: string;
  quest: Quest;
};

export default function QuestDetailClientShell({
  orgId,
  quest,
}: QuestDetailClientShellProps) {
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

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

  const isActive =
    !!userId && !!player?.activeQuestIds?.includes(quest.id);
  const isCompleted =
    !!userId && !!player?.completedQuestIds?.includes(quest.id);

  const initialStatus: QuestStatus = isCompleted
    ? "completed"
    : isActive
    ? "in-progress"
    : "not-started";

  const playerLabel =
    player?.displayName || player?.name || userId || "Guest Player";

  const coverImageUrl =
    quest.coverImageUrl ||
    quest.imageUrl ||
    quest.media?.imageUrl ||
    null;

  const rules: string[] =
    quest.rules || quest.meta?.rules || [];

  const levels: any[] =
    quest.levels || quest.meta?.levels || [];

  const gamePath: string | null =
    quest.gamePath || quest.meta?.gamePath || null;

  const playHref =
    gamePath && user
      ? `${gamePath}?orgId=${encodeURIComponent(
          orgId,
        )}&userId=${encodeURIComponent(user.uid)}`
      : null;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-sky-300/80">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-700/70 bg-slate-950/80 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
          <span className="uppercase tracking-[0.3em]">Linked ID</span>
          <span className="font-mono text-sky-100">{playerLabel}</span>
        </div>

        <Link
          href={`/bitgalaxy/quests?orgId=${encodeURIComponent(orgId)}`}
          className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 px-3 py-1 text-[10px] text-sky-200 hover:bg-sky-500/10"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          Back to quests
        </Link>
      </div>

      {/* Briefing */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(139,92,246,0.35)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(139,92,246,0.26)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.18)_0,_transparent_55%)]"
        />

        <div className="relative grid gap-4 md:grid-cols-[360px_1fr]">
          <div className="overflow-hidden rounded-xl border border-violet-500/30 bg-slate-950/60">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt={quest.title}
                className="h-[220px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center bg-slate-900/40 text-[11px] text-violet-200/70">
                Screenshot not set (coverImageUrl)
              </div>
            )}
            <div className="border-t border-slate-800/70 px-3 py-2 text-[10px] text-violet-200/80">
              Mission Intel • {quest.type.toUpperCase()} • Base Reward{" "}
              <span className="font-semibold text-emerald-300">
                +{quest.xp} XP
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/90">
                Briefing
              </p>
              <h1 className="mt-1 text-xl font-semibold text-violet-50">
                {quest.title}
              </h1>
              <p className="mt-2 text-sm text-violet-100/80">
                {quest.description}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                Rules
              </p>
              {rules.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-violet-100/80">
                  {rules.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-violet-200/70">
                  Add <span className="font-mono">rules: string[]</span> to this
                  quest doc.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                XP by Level (3 Tiers)
              </p>

              {Array.isArray(levels) && levels.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {levels.slice(0, 3).map((lvl: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
                    >
                      <p className="text-[11px] font-semibold text-violet-100">
                        {lvl.label || `Level ${idx + 1}`}
                      </p>
                      <p className="mt-1 text-[10px] text-violet-200/70">
                        {lvl.description || "Complete the tier objective."}
                      </p>
                      <div className="mt-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        +{Number(lvl.xp || 0).toLocaleString()} XP
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-violet-200/70">
                  Add{" "}
                  <span className="font-mono">
                    levels: [{`{ label, xp, description? }`}]
                  </span>{" "}
                  to this quest doc.
                </p>
              )}
            </div>

            {gamePath && (
              <Link
                href={user ? (playHref as string) : "/login"}
                className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold shadow-[0_0_25px_rgba(139,92,246,0.55)] ${
                  user
                    ? "bg-violet-500 text-slate-950 hover:bg-violet-400"
                    : "bg-slate-700/70 text-violet-50 hover:bg-slate-600/80"
                }`}
              >
                {user
                  ? isCompleted
                    ? "Replay mission"
                    : "Start mission"
                  : "Sign in to play"}
              </Link>
            )}

            {playerLoading && user && (
              <p className="text-[10px] text-violet-300/70">
                Syncing your mission status…
              </p>
            )}
          </div>
        </div>
      </section>

      <QuestDetail
        orgId={orgId}
        quest={quest}
        initialStatus={initialStatus}
      />
    </div>
  );
}