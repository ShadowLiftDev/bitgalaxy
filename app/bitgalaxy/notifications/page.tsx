import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { getNotifications } from "@/lib/bitgalaxy/getNotifications";
import { Timestamp } from "firebase-admin/firestore";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export const metadata = {
  title: "BitGalaxy – Notifications",
};

type BitGalaxyNotificationsPageProps = {
  // Following the BitGalaxyHomePage pattern
  searchParams: Promise<{ userId?: string }>;
};

function formatTimestamp(ts: Timestamp | null | undefined) {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export default async function BitGalaxyNotificationsPage({
  searchParams,
}: BitGalaxyNotificationsPageProps) {
  const orgId = DEFAULT_ORG_ID;

  const resolvedSearch = (await searchParams) ?? {};
  const userId = resolvedSearch.userId ?? null;

  // 🌀 No user yet → use the same lookup gate as the dashboard
  if (!userId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />

        <section className="mt-2">
          <PlayerLookupGate orgId={orgId} />
        </section>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Are you the owner of this world?{" "}
          <a
            href={`/hq/${encodeURIComponent(orgId)}/bitgalaxy`}
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            Open the BitGalaxy console in NeonHQ
          </a>
          .
        </p>
      </div>
    );
  }

  // ✅ We have a player: load notifications for this player
  const notifications = await getNotifications(orgId, userId, 50);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <section className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
        {/* signal wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.25)_0,_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.9)_40%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                Comms Feed
              </div>
              <h2 className="mt-2 text-lg font-semibold text-sky-50">
                BitGalaxy Notifications
              </h2>
              <p className="text-xs text-sky-100/80">
                System pings about quests, streaks, and seasonal events inside
                this world.
              </p>
            </div>
            <div className="text-right text-[11px] text-sky-200/85">
              <p>
                <span className="font-semibold text-sky-100">
                  {unreadCount}
                </span>{" "}
                unread ·{" "}
                <span className="font-semibold text-sky-100">
                  {notifications.length}
                </span>{" "}
                total
              </p>
              <p className="mt-0.5 text-[10px] text-sky-200/60">
                Real-time and read-sync can be wired in a later client pass.
              </p>
            </div>
          </header>

          {notifications.length === 0 ? (
            <div className="mt-2 rounded-xl border border-sky-500/40 bg-slate-950/95 px-4 py-4 text-xs text-sky-100/85">
              <p className="font-medium text-sky-100">
                No signals in the feed.
              </p>
              <p className="mt-1 text-sky-200/85">
                As soon as quests trigger events, seasons roll over, or rewards
                unlock, your comms stream will light up with updates here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {notifications.map((n) => {
                const unread = !n.read;
                return (
                  <div
                    key={n.id}
                    className={[
                      "relative rounded-xl border px-4 py-3 text-xs shadow-[0_0_18px_rgba(15,23,42,0.9)] transition",
                      unread
                        ? "border-emerald-400/60 bg-slate-950/95 text-sky-50"
                        : "border-slate-800/80 bg-slate-950/85 text-sky-200/90",
                    ].join(" ")}
                  >
                    {/* unread pulse */}
                    {unread && (
                      <span className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                      </span>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                          {n.type}
                        </span>
                        {unread && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                            New
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-sky-300/80">
                        {formatTimestamp(n.createdAt as Timestamp | null)}
                      </span>
                    </div>

                    <div className="mt-2 font-semibold text-sky-50">
                      {n.title}
                    </div>
                    <div className="mt-1 text-[11px] text-sky-200/85">
                      {n.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <footer className="mt-3 text-[11px] text-sky-200/80">
            Mark-as-read actions and live streaming can be wired into this feed
            through NeonHQ rules and client-side listeners whenever you&apos;re
            ready for real-time BitGalaxy ops.
          </footer>
        </div>
      </section>
    </div>
  );
}