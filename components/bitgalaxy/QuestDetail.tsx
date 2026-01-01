"use client";

import { useState } from "react";
import type { BitGalaxyQuest } from "@/lib/bitgalaxy/getQuests";

const typeLabels: Record<string, string> = {
  checkin: "Check-in",
  purchase: "Purchase",
  photo: "Photo",
  referral: "Referral",
  visit: "Visit",
  custom: "Quest",
  arcade: "Arcade Mission",
};

// 👇 Client-side shape: we don’t *need* createdAt/updatedAt here
type QuestDetailQuest = Omit<BitGalaxyQuest, "createdAt" | "updatedAt">;

export type QuestStatus = "not-started" | "in-progress" | "completed";

type QuestDetailProps = {
  orgId: string;
  quest: QuestDetailQuest;
  initialStatus?: QuestStatus;
  onStatusChange?: (status: QuestStatus) => void;
};

export function QuestDetail({
  orgId,
  quest,
  initialStatus = "not-started",
  onStatusChange,
}: QuestDetailProps) {
  const [status, setStatus] = useState<QuestStatus>(initialStatus);
  const [loadingAction, setLoadingAction] =
    useState<"start" | "complete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const typeLabel = typeLabels[quest.type] ?? "Quest";
  const isDisabled = !quest.isActive;
  const isArcade = quest.type === "arcade";

  function updateStatus(next: QuestStatus, message?: string) {
    setStatus(next);
    if (message) setSuccess(message);
    if (onStatusChange) onStatusChange(next);
  }

  async function handleStart() {
    if (isDisabled || status !== "not-started") return;

    setError(null);
    setSuccess(null);
    setLoadingAction("start");

    try {
      const res = await fetch("/api/bitgalaxy/quests/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          questId: quest.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to start quest.");
      }

      updateStatus(
        "in-progress",
        "Quest started! You can now complete it when finished.",
      );
    } catch (err: any) {
      console.error("Quest start error:", err);
      setError(err?.message || "Something went wrong starting this quest.");
    } finally {
      setLoadingAction(null);
    }
  }

  // NOTE: completion is still reserved for staff/owner flows
  async function handleComplete() {
    setError(null);
    setSuccess(null);
    setLoadingAction("complete");

    try {
      const res = await fetch("/api/bitgalaxy/quests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          questId: quest.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to complete quest.");
      }

      updateStatus(
        "completed",
        `Quest completed! You earned +${quest.xp} XP.`,
      );
    } catch (err: any) {
      console.error("Quest complete error:", err);
      setError(err?.message || "Something went wrong completing this quest.");
    } finally {
      setLoadingAction(null);
    }
  }

  function renderStatusBadge() {
    if (!quest.isActive) {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-500/80 bg-slate-800/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-200">
          Inactive
        </span>
      );
    }

    let label = "Not Started";
    let color = "border-slate-500/80 bg-slate-800/80 text-slate-200";

    if (status === "in-progress") {
      label = "In Progress";
      color = "border-amber-400/80 bg-amber-500/10 text-amber-100";
    } else if (status === "completed") {
      label = "Completed";
      color = "border-emerald-400/80 bg-emerald-500/15 text-emerald-100";
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${color}`}
      >
        {label}
      </span>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-sky-500/40 bg-slate-950/80 p-5 text-xs text-sky-100">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-sky-50">
              {quest.title}
            </h1>
            <span className="rounded-full border border-sky-400/60 bg-sky-500/10 px-2 py-[2px] text-[10px] uppercase tracking-wide text-sky-200">
              {typeLabel}
            </span>
          </div>
          {quest.description && (
            <p className="mt-1 whitespace-pre-line text-[11px] text-sky-300/90">
              {quest.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            Reward: +{quest.xp} XP
          </span>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Constraints / meta */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
            Org
          </p>
          <p className="font-mono text-[11px] text-sky-200">{orgId}</p>
        </div>

        {quest.programId && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
              Program / Season
            </p>
            <p className="text-[11px] text-sky-200">
              <span className="font-mono text-sky-100">{quest.programId}</span>
            </p>
          </div>
        )}

        {quest.maxCompletionsPerUser != null && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
              Max completions
            </p>
            <p className="text-[11px] text-sky-200">
              {quest.maxCompletionsPerUser === 1
                ? "One-time quest"
                : `${quest.maxCompletionsPerUser} times per player`}
            </p>
          </div>
        )}

        {quest.requiresStaffApproval && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
              Approval
            </p>
            <p className="text-[11px] text-amber-200">
              Requires staff approval to complete.
            </p>
          </div>
        )}
      </div>

      {quest.checkinCode && (
        <div className="rounded-lg border border-sky-500/40 bg-slate-950/90 p-3 text-[11px]">
          <p className="font-semibold text-sky-200">
            Check-in Code (for in-venue use)
          </p>
          <p className="mt-1 font-mono text-sm tracking-wide text-sky-100">
            {quest.checkinCode}
          </p>
          <p className="mt-1 text-[10px] text-sky-400/80">
            Staff may show this code on screens or printed signs for players to
            enter on the check-in page.
          </p>
        </div>
      )}

      {/* Metadata display (if present) */}
      {quest.metadata && Object.keys(quest.metadata).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
            Extra Rules / Metadata
          </p>
          <pre className="max-h-48 overflow-auto rounded-lg border border-sky-500/30 bg-slate-950/90 p-3 text-[11px] text-sky-100">
            {JSON.stringify(quest.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Messages */}
      {error && <p className="text-[11px] text-red-300">{error}</p>}
      {success && <p className="text-[11px] text-emerald-300">{success}</p>}

      {/* Actions */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] text-slate-400">
          {quest.isActive ? (
            isArcade ? (
              <p>
                This is an{" "}
                <span className="font-semibold text-slate-200">
                  arcade mission
                </span>
                . Your XP is awarded automatically when your game run is logged
                in-system. Show your completion screen to staff if they ask to
                verify.
              </p>
            ) : (
              <p>
                This quest is tracked by{" "}
                <span className="font-semibold text-slate-200">
                  staff or owner in-system
                </span>
                . Start it here, then show this screen to staff when you&apos;re
                finished so they can confirm completion.
              </p>
            )
          ) : (
            <p>This quest is currently inactive. Talk to staff for details.</p>
          )}
        </div>

        {/* No "Start" for arcade missions – they’re handled by the game endpoints */}
        {quest.isActive && !isArcade && (
          <button
            type="button"
            disabled={
              isDisabled ||
              loadingAction === "start" ||
              status === "in-progress" ||
              status === "completed"
            }
            onClick={handleStart}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-sky-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "start"
              ? "Starting..."
              : status === "not-started"
              ? "Start quest"
              : status === "in-progress"
              ? "Quest started"
              : "Completed"}
          </button>
        )}
      </div>
    </section>
  );
}

export default QuestDetail;