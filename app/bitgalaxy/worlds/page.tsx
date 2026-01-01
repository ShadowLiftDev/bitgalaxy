import Link from "next/link";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getWorlds } from "@/lib/bitgalaxy/getWorlds";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export const metadata = {
  title: "BitGalaxy – Worlds",
};

export default async function BitGalaxyWorldsPage() {
  const worlds = await getWorlds();
  const currentWorldId = DEFAULT_ORG_ID;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={currentWorldId} />

      <section className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(139,92,246,0.45)]">
        {/* cosmic wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(129,140,248,0.32)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%),linear-gradient(120deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.92)_40%,rgba(15,23,42,0.92)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/50 bg-violet-500/15 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-200">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
                World Directory
              </div>
              <h2 className="mt-2 text-lg font-semibold text-violet-50">
                BitGalaxy Worlds
              </h2>
              <p className="text-xs text-violet-100/80">
                Explore every organization running BitGalaxy. Each world can
                have its own quests, seasons, and progression curve.
              </p>
            </div>
            <div className="text-right text-[11px] text-violet-200/85">
              <p>
                {worlds.length} world{worlds.length === 1 ? "" : "s"} online
              </p>
              <p className="mt-0.5 text-[10px] text-violet-200/65">
                New worlds appear here as soon as they&apos;re activated in
                NeonHQ.
              </p>
            </div>
          </header>

          {worlds.length === 0 ? (
            <div className="mt-2 rounded-xl border border-violet-500/40 bg-slate-950/95 px-4 py-4 text-xs text-violet-100/85">
              <p className="font-medium text-violet-100">
                No BitGalaxy worlds detected.
              </p>
              <p className="mt-1 text-violet-200/85">
                Once organizations turn on BitGalaxy in NeonHQ, their worlds
                will surface here as selectable shards inside the network.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((world) => {
                const isCurrent = world.orgId === currentWorldId;
                const worldName = world.name || world.orgId;

                // createdAt may be Firestore Timestamp or plain Date
                let createdLabel = "";
                const createdAt: any = (world as any).createdAt;
                if (createdAt && typeof createdAt.toDate === "function") {
                  const d = createdAt.toDate();
                  createdLabel = d.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }

                return (
                  <Link
                    key={world.orgId}
                    href={`/bitgalaxy/worlds/${encodeURIComponent(
                      world.orgId,
                    )}`}
                    className="group relative overflow-hidden rounded-xl border border-violet-500/40 bg-slate-950/90 p-4 text-xs text-violet-50 shadow-[0_0_24px_rgba(15,23,42,0.95)] transition hover:border-violet-300/80 hover:shadow-[0_0_30px_rgba(139,92,246,0.75)]"
                  >
                    {/* glow sweep */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 translate-y-6 bg-gradient-to-t from-transparent via-violet-400/10 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                    />

                    <div className="relative flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-violet-50">
                        {worldName}
                      </h3>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                          Current world
                        </span>
                      )}
                    </div>

                    {createdLabel && (
                      <p className="relative mt-1 text-[11px] text-violet-200/80">
                        Since {createdLabel}
                      </p>
                    )}

                    <p className="relative mt-3 text-[11px] text-violet-100/80">
                      Tap to view quests and basic stats for this world&apos;s
                      grid.
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <p className="mt-2 text-[11px] text-violet-200/80">
            Each world runs on the same BitGalaxy core but can host its own
            programs, quests, and NeonMatrix feeds.
          </p>
        </div>
      </section>
    </div>
  );
}