import Link from "next/link";
import type { BitGalaxyQuest } from "@/lib/bitgalaxy/getQuests";

type ActiveQuestCardProps = {
  quest: BitGalaxyQuest;
  orgId: string;
};

export function ActiveQuestCard({ quest, orgId }: ActiveQuestCardProps) {
  const questUrl = `/bitgalaxy/quests/${quest.id}?orgId=${encodeURIComponent(
    orgId,
  )}`;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-slate-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-200">
            {quest.title}
          </h3>
          <p className="mt-1 text-xs text-emerald-100/80 line-clamp-2">
            {quest.description}
          </p>
          <p className="mt-2 text-[11px] text-emerald-300/80">
            Reward: <span className="font-semibold">+{quest.xp} XP</span>
          </p>
        </div>
        <Link
          href={questUrl}
          className="rounded-full border border-emerald-400/70 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/10 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}