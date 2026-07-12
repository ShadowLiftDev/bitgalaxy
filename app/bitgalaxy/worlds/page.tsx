import Link from "next/link";

import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getWorlds } from "@/lib/bitgalaxy/getWorlds";

type BitGalaxyWorldsPageProps = {
  searchParams?: Promise<{
    orgId?: string;
    memberId?: string;
  }>;
};

export const metadata = {
  title: "BitGalaxy · Worlds",
};

export default async function BitGalaxyWorldsPage({
  searchParams,
}: BitGalaxyWorldsPageProps) {
  const resolved = searchParams
    ? await searchParams
    : {};

  const currentWorldId =
    resolved.orgId?.trim() || null;

  const memberId =
    resolved.memberId?.trim() || null;

  const worlds = await getWorlds();

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName="BitGalaxy" />

      <section className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(139,92,246,0.45)]">
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

              <h1 className="mt-2 text-lg font-semibold text-violet-50">
                BitGalaxy Worlds
              </h1>

              <p className="text-xs text-violet-100/80">
                Explore organizations currently operating active public
                BitGalaxy worlds.
              </p>
            </div>

            <div className="text-right text-[11px] text-violet-200/85">
              <p>
                {worlds.length} world
                {worlds.length === 1 ? "" : "s"} online
              </p>

              <p className="mt-0.5 text-[10px] text-violet-200/65">
                Worlds appear after BitGalaxy is activated and public access is
                enabled.
              </p>
            </div>
          </header>

          {worlds.length === 0 ? (
            <div className="mt-2 rounded-xl border border-violet-500/40 bg-slate-950/95 px-4 py-4 text-xs text-violet-100/85">
              <p className="font-medium text-violet-100">
                No public BitGalaxy worlds detected.
              </p>

              <p className="mt-1 text-violet-200/85">
                Organizations will appear here after their BitGalaxy world is
                activated in NeonHQ.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((world) => {
                const isCurrent =
                  currentWorldId === world.orgId;

                const worldName =
                  world.name || world.orgId;

                const createdLabel =
                  formatDate(world.createdAt);

                const worldParams =
                  new URLSearchParams();

                if (memberId) {
                  worldParams.set(
                    "memberId",
                    memberId,
                  );
                }

                const worldHref =
                  worldParams.size > 0
                    ? `/bitgalaxy/worlds/${encodeURIComponent(
                        world.orgId,
                      )}?${worldParams.toString()}`
                    : `/bitgalaxy/worlds/${encodeURIComponent(
                        world.orgId,
                      )}`;

                return (
                  <Link
                    key={world.orgId}
                    href={worldHref}
                    className="group relative overflow-hidden rounded-xl border border-violet-500/40 bg-slate-950/90 p-4 text-xs text-violet-50 shadow-[0_0_24px_rgba(15,23,42,0.95)] transition hover:border-violet-300/80 hover:shadow-[0_0_30px_rgba(139,92,246,0.75)]"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 translate-y-6 bg-gradient-to-t from-transparent via-violet-400/10 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                    />

                    <div className="relative flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-violet-50">
                        {worldName}
                      </h2>

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

                    <div className="relative mt-3 flex flex-wrap gap-3 text-[10px] text-violet-200/75">
                      <span>
                        Guests: {world.guestModeEnabled ? "Enabled" : "Disabled"}
                      </span>

                      <span>
                        Public join: {world.publicJoinEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <p className="relative mt-3 text-[11px] text-violet-100/80">
                      Open this world to view its active quests and public
                      progression grid.
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <p className="mt-2 text-[11px] text-violet-200/80">
            Each world shares the BitGalaxy engine while retaining its own
            quests, programs, members, and progression state.
          </p>
        </div>
      </section>
    </div>
  );
}

function formatDate(
  value: unknown,
): string | null {
  if (!value) {
    return null;
  }

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    date = (
      value as {
        toDate: () => Date;
      }
    ).toDate();
  } else if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (
    !date ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}