import Link from "next/link";
import type { PlayerInventoryItem } from "@/lib/bitgalaxy/getPlayer";

type InventoryItemProps = {
  orgId: string;
  userId?: string;

  /**
   * Raw inventory entry from BitGalaxy player doc.
   * You can extend this via the meta fields below.
   */
  item: PlayerInventoryItem;

  /**
   * Optional metadata from a master catalog (RewardCircle, Referralink, etc.)
   */
  label?: string;
  description?: string;
  icon?: string; // emoji or short text icon
  appTag?: "BitGalaxy" | "RewardCircle" | "Referralink" | string;

  /**
   * Optional cross-app deeplinks. These let NeonHQ drop this component
   * into any dashboard and still click out to other apps.
   */
  hqUrl?: string;           // e.g. `/hq/${orgId}`
  rewardCircleUrl?: string; // e.g. `/hq/${orgId}/rewardcircle`
  referralinkUrl?: string;  // e.g. `/hq/${orgId}/referralink`
};

export function InventoryItem({
  orgId,
  userId,
  item,
  label,
  description,
  icon,
  appTag,
  hqUrl,
  rewardCircleUrl,
  referralinkUrl,
}: InventoryItemProps) {
  const displayName = label || item.itemId;
  const displayDescription =
    description || (item.source ? `Origin: ${item.source}` : "");

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-sky-500/40 bg-slate-950/80 p-4">
      <div className="flex flex-1 items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/90 text-base">
          <span className="select-none">
            {icon || "🎁"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-sky-100">
              {displayName}
            </h3>
            {appTag && (
              <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-sky-200">
                {appTag}
              </span>
            )}
          </div>

          {displayDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] text-sky-300/80">
              {displayDescription}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-sky-300/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Qty:{" "}
              <span className="font-semibold text-sky-100">
                {item.quantity ?? 1}
              </span>
            </span>

            {item.source && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Source:{" "}
                <span className="font-mono text-[10px] text-sky-200">
                  {item.source}
                </span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Org:{" "}
              <span className="font-mono text-[10px] text-sky-200">
                {orgId}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Cross-app quick actions (NeonHQ / RewardCircle / Referralink) */}
      {(hqUrl || rewardCircleUrl || referralinkUrl) && (
        <div className="flex flex-col items-end gap-1 text-[10px]">
          {hqUrl && (
            <Link
              href={hqUrl}
              className="rounded-full border border-slate-600 bg-slate-900/90 px-3 py-[5px] font-semibold text-sky-200 hover:border-sky-400 hover:bg-slate-800"
            >
              View in NeonHQ
            </Link>
          )}

          {rewardCircleUrl && (
            <Link
              href={rewardCircleUrl}
              className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-[5px] font-semibold text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/15"
            >
              Rewards / Loyalty
            </Link>
          )}

          {referralinkUrl && (
            <Link
              href={referralinkUrl}
              className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-[5px] font-semibold text-amber-100 hover:border-amber-300 hover:bg-amber-500/15"
            >
              Referralink
            </Link>
          )}

          {userId && (
            <p className="mt-1 text-[9px] text-slate-400">
              Player: <span className="font-mono">{userId}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryItem;