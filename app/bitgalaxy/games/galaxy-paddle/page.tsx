import Link from "next/link";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { GalaxyPaddleGame } from "@/components/bitgalaxy/GalaxyPaddleGame";
import { getServerUser } from "@/lib/auth-server";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

type GalaxyPaddlePageProps = {
  // keep userId only for dev overrides if you ever need it
  searchParams?: Promise<{ orgId?: string; userId?: string }>;
};

export const metadata = {
  title: "BitGalaxy – Galaxy Paddle Tutorial",
};

export default async function GalaxyPaddlePage(
  props: GalaxyPaddlePageProps,
) {
  const resolvedSearch = (await props.searchParams) ?? {};
  const orgId = resolvedSearch.orgId ?? DEFAULT_ORG_ID;

  const authed = await getServerUser();
  let userId = authed?.uid ?? null;

  // Optional: dev override with ?userId=, just like quests
  if (process.env.NODE_ENV !== "production" && resolvedSearch.userId) {
    userId = resolvedSearch.userId;
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />
        <section className="mt-2 rounded-2xl border border-amber-500/30 bg-slate-950/85 p-5 text-sm text-amber-100">
          <h1 className="text-base font-semibold text-amber-50">
            Sign in to launch Galaxy Paddle
          </h1>
          <p className="mt-2 text-xs text-amber-200/85">
            BitGalaxy games are tied to your player profile so we can track your XP,
            ranks, and weekly progress.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/15"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            Sign in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />
      <section>
        <GalaxyPaddleGame orgId={orgId} userId={userId} />
      </section>
    </div>
  );
}