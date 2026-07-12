import Link from "next/link";
import { notFound } from "next/navigation";

import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getQuests } from "@/lib/bitgalaxy/getQuests";
import { getWorld } from "@/lib/bitgalaxy/getWorld";

type WorldDetailPageProps = {
  params: Promise<{
    orgId: string;
  }>;

  searchParams?: Promise<{
    memberId?: string;
  }>;
};

export const metadata = {
  title: "BitGalaxy · World",
};

export default async function BitGalaxyWorldDetailPage({
  params,
  searchParams,
}: WorldDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams
    ? await searchParams
    : {};

  const orgId = decodeURIComponent(
    resolvedParams.orgId,
  ).trim();

  const memberId =
    resolvedSearch.memberId?.trim() || null;

  if (!orgId) {
    notFound();
  }

  const world = await getWorld(orgId);

  if (
    !world ||
    world.status !== "active" ||
    world.allowPublicAccess !== true
  ) {
    notFound();
  }

  const quests = await getQuests(orgId, {
    activeOnly: true,
  });

  const createdLabel = formatDate(
    world.createdAt,
  );

  const directoryParams =
    new URLSearchParams();

  if (memberId) {
    directoryParams.set(
      "memberId",
      memberId,
    );
  }

  const directoryHref =
    directoryParams.size > 0
      ? `/bitgalaxy/worlds?${directoryParams.toString()}`
      : "/bitgalaxy/worlds";

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={world.name} />

      <section className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/85 p-5 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_top,_rgba(56,189,248,0.3)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25)_0,_transparent_55%),linear-gradient(115deg,rgba(15,23,42,0.98)_0,rgba(15,23,42,0.92)_40%,rgba(15,23,42,0.92)_60%,rgba(15,23,42,0.98)_100%)]"
        />

        <div className="relative space-y-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />

                World Overview
              </div>

              <h1 className="mt-2 text-lg font-semibold text-sky-50">
                {world.name}
              </h1>

              <p className="text-xs text-sky-100/80">
                An active public BitGalaxy world operated under{" "}
                <span className="font-semibold text-sky-50">
                  {world.orgId}
                </span>
                .
              </p>
            </div>

            <div className="flex gap-4 text-xs text-sky-200/85">
              <div className="flex flex-col items-end rounded-xl border border-sky-500/30 bg-slate-950/90 px-3 py-2">
                <span className="text-[11px] text-sky-300/85">
                  Players
                </span>

                <span className="mt-0.5 text-base font-semibold text-sky-50">
                </span>
              </div>

              <div className="flex flex-col items-end rounded-xl border border-sky-500/30 bg-slate-950/90 px-3 py-2">
                <span className="text-[11px] text-sky-300/85">
                  Quests
                </span>

                <span className="mt-0.5 text-base font-semibold text-sky-50">
                </span>
              </div>
            </div>
          </header>

          {createdLabel && (
            <p className="mt-1 text-[11px] text-sky-200/80">
              World created on {createdLabel}.
            </p>
          )}

          <div className="mt-3">
            <h2 className="text-xs font-semibold text-sky-200">
              Active quests in this world
            </h2>

            {quests.length === 0 ? (
              <p className="mt-2 rounded-xl border border-sky-500/30 bg-slate-950/95 px-4 py-3 text-xs text-sky-200/85">
                This world does not currently have any active quests.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quests.map((quest) => {
                  const questParams =
                    new URLSearchParams({
                      orgId,
                    });

                  if (memberId) {
                    questParams.set(
                      "memberId",
                      memberId,
                    );
                  }

                  const questUrl =
                    `/bitgalaxy/quests/${encodeURIComponent(
                      quest.id,
                    )}?${questParams.toString()}`;

                  return (
                    <Link
                      key={quest.id}
                      href={questUrl}
                      className="group relative overflow-hidden rounded-xl border border-sky-500/40 bg-slate-950/90 p-4 text-xs text-sky-100 shadow-[0_0_24px_rgba(15,23,42,0.95)] transition hover:border-sky-300/80 hover:shadow-[0_0_30px_rgba(56,189,248,0.75)]"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 translate-y-6 bg-gradient-to-t from-transparent via-sky-400/10 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                      />

                      <div className="relative flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[13px] font-semibold text-sky-50">
                            {quest.title}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-[11px] text-sky-200/85">
                            {quest.description}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                          +{quest.xp} XP
                        </span>
                      </div>

                      <p className="relative mt-2 text-[10px] text-sky-300/80">
                        Type:{" "}
                        <span className="font-mono text-sky-100">
                          {quest.type}
                        </span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-sky-500/20 pt-4 text-[11px] text-sky-200/80">
            <span>
              Quest progress is stored independently for each member and
              organization world.
            </span>

            <Link
              href={directoryHref}
              className="font-medium text-sky-300 hover:text-sky-200"
            >
              Back to world directory
            </Link>
          </footer>
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