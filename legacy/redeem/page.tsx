import Link from "next/link";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getInventory } from "@/lib/bitgalaxy/getInventory";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

const REWARDCIRCLE_URL =
  process.env.NEXT_PUBLIC_REWARDCIRCLE_APP_URL ??
  "https://www.rewardcircle.app";

function getDevUserId() {
  const devUid = process.env.NEXT_PUBLIC_DEV_UID;
  if (!devUid) {
    throw new Error(
      "BitGalaxy Redeem: set NEXT_PUBLIC_DEV_UID in .env.local to a test Firebase UID (or wire real auth).",
    );
  }
  return devUid;
}

export const metadata = {
  title: "BitGalaxy – Redeem",
};

interface RedeemableItem {
  itemId: string;
  quantity: number;
  label?: string;
  description?: string;
  rewardId?: string;
  source?: string;
}

export default async function BitGalaxyRedeemPage() {
  const orgId = DEFAULT_ORG_ID;
  const userId = getDevUserId();

  const inventory = await getInventory(orgId, userId);

  const redeemable: RedeemableItem[] = inventory.filter(
    (item: any) => !!item.rewardId,
  );

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
        {/* holo wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(16,185,129,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.9)_40%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                Reward Bridge
              </div>
              <h2 className="mt-2 text-lg font-semibold text-emerald-50">
                Redeem Your Rewards
              </h2>
              <p className="text-xs text-emerald-100/80">
                Convert BitGalaxy items into real-world perks through the
                RewardCircle engine.
              </p>
            </div>
            <div className="text-right text-[11px] text-emerald-200/85">
              <p>
                {redeemable.length} redeemable item
                {redeemable.length === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-200/65">
                Each token here links directly into a RewardCircle redemption
                flow.
              </p>
            </div>
          </header>

          {redeemable.length === 0 ? (
            <div className="mt-2 rounded-xl border border-emerald-500/40 bg-slate-950/95 px-4 py-4 text-xs text-emerald-100/85">
              <p className="font-medium text-emerald-100">
                No redeemable items… yet.
              </p>
              <p className="mt-1 text-emerald-200/85">
                As you complete quests and hit XP thresholds that unlock
                RewardCircle items, those keys will appear here with direct
                links out to claim them.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {redeemable.map((item) => {
                const rewardId = item.rewardId!;
                const url = `${REWARDCIRCLE_URL}/redeem?orgId=${encodeURIComponent(
                  orgId,
                )}&userId=${encodeURIComponent(
                  userId,
                )}&rewardId=${encodeURIComponent(rewardId)}`;

                return (
                  <div
                    key={item.itemId}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4 text-xs text-emerald-50 shadow-[0_0_24px_rgba(15,23,42,0.95)] transition hover:border-emerald-400/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
                  >
                    {/* glow sweep */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 translate-y-6 bg-gradient-to-t from-transparent via-emerald-400/10 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[13px] font-semibold text-emerald-50">
                          {item.label ?? item.itemId}
                        </h3>
                        <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                          x{item.quantity ?? 1}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-1 text-[11px] text-emerald-100/80">
                          {item.description}
                        </p>
                      )}

                      {item.source && (
                        <p className="mt-2 text-[10px] text-emerald-300/85">
                          Source:{" "}
                          <span className="font-mono text-emerald-100/90">
                            {item.source}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="relative mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-200/80">
                        Reward ID:{" "}
                        <span className="font-mono text-emerald-100">
                          {rewardId}
                        </span>
                      </span>
                      <Link
                        href={url}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400 hover:shadow-[0_0_18px_rgba(16,185,129,0.95)]"
                      >
                        Redeem in RewardCircle
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-[11px] text-emerald-200/80">
            Redemption flows are powered by RewardCircle. A future BitGalaxy
            pass can sync redemption status back into your inventory and history
            in real time, closing the loop between quest, XP, and reward.
          </p>
        </div>
      </section>
    </div>
  );
}