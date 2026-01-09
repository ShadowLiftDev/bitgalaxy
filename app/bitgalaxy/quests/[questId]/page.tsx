import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";

type QuestDetailsPageProps = {
  searchParams?: Promise<{ orgId?: string; userId?: string }>;
  params: Promise<{ questId: string }>;
};

export const metadata = {
  title: "BitGalaxy – Quest Details",
};

export default async function QuestDetailsPage({
  searchParams,
  params,
}: QuestDetailsPageProps) {
  const { questId } = await params;
  const resolved = (searchParams ? await searchParams : {}) as {
    orgId?: string;
    userId?: string;
  };

  const orgId = (resolved.orgId ?? process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox").trim();
  const userId = resolved.userId ?? null;

  const snap = await adminDb
    .collection("orgs")
    .doc(orgId)
    .collection("bitgalaxyQuests")
    .doc(questId)
    .get();

  if (!snap.exists) {
    return (
      <div className="space-y-4 text-xs text-slate-100">
        <p>That quest could not be found.</p>
        <Link
          href={`/bitgalaxy?${new URLSearchParams({ orgId, userId: userId ?? "" }).toString()}`}
          className="text-sky-300 hover:text-sky-200"
        >
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  const quest = snap.data() as any;
  const isArcade = quest.type === "arcade";
  const loyalty = quest.loyaltyReward ?? { enabled: false, pointsPerCompletion: 0 };

  // Optional: build arcade href if needed
  // const arcadeHref = isArcade ? buildGamePlayHref(questId, orgId, userId) : null;

  return (
    <div className="space-y-5 text-xs text-sky-100">
      <Link
        href={`/bitgalaxy?${new URLSearchParams({ orgId, userId: userId ?? "" }).toString()}`}
        className="text-[11px] text-sky-200/80 hover:text-sky-100"
      >
        &larr; Back to dashboard
      </Link>

      <section className="rounded-2xl border border-sky-500/40 bg-slate-950/90 p-5 shadow-[0_0_36px_rgba(56,189,248,0.4)]">
        <h1 className="text-lg font-semibold text-sky-50">{quest.title}</h1>
        <p className="mt-1 text-[11px] text-sky-200/85">{quest.description}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-[11px]">
          <div>
            <p className="text-sky-400/80 uppercase tracking-[0.18em] text-[10px]">
              Type
            </p>
            <p className="mt-1 text-sky-100">{quest.type}</p>
          </div>
          <div>
            <p className="text-sky-400/80 uppercase tracking-[0.18em] text-[10px]">
              XP Reward
            </p>
            <p className="mt-1 text-emerald-200 font-semibold">
              {quest.xp} XP
            </p>
          </div>
          <div>
            <p className="text-sky-400/80 uppercase tracking-[0.18em] text-[10px]">
              Loyalty
            </p>
            {loyalty.enabled && loyalty.pointsPerCompletion > 0 ? (
              <p className="mt-1 text-emerald-200 font-semibold">
                +{loyalty.pointsPerCompletion} loyalty pts
              </p>
            ) : (
              <p className="mt-1 text-slate-400">No loyalty bonus</p>
            )}
          </div>
        </div>

        {/* CTA zone: start quest or open arcade */}
        <div className="mt-5 flex flex-wrap gap-2">
          {/* Example: generic Start Quest; you can wire this to /api/bitgalaxy/quests/start */}
          <button
            className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Start quest
          </button>

          {isArcade && (
            <Link
              href={`/bitgalaxy/games?${new URLSearchParams({ orgId, userId: userId ?? "" }).toString()}`}
              className="rounded-full border border-sky-400/80 px-4 py-2 text-[11px] text-sky-200 hover:bg-sky-500/10"
            >
              Open Arcade
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}