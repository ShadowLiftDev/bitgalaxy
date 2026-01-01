import Link from "next/link";
import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerLookupGate } from "@/components/bitgalaxy/PlayerLookupGate";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

type TutorialPageProps = {
  searchParams?: { userId?: string };
};

/**
 * NOTE:
 * We reuse the same dev UID fallback pattern as /bitgalaxy/page.tsx.
 * In production, you'll swap this to real auth.
 */
function getDevUserId() {
  const devUid = process.env.NEXT_PUBLIC_DEV_UID;
  if (!devUid) {
    throw new Error(
      "BitGalaxy Tutorial: set NEXT_PUBLIC_DEV_UID in .env.local to a test Firebase UID (or wire actual auth).",
    );
  }
  return devUid;
}

export const metadata = {
  title: "BitGalaxy – Signal Lock Tutorial",
};

export default async function BitGalaxyTutorialPage({
  searchParams,
}: TutorialPageProps) {
  const orgId = DEFAULT_ORG_ID;

  const queryUserId = searchParams?.userId || null;
  const devUserId =
    !queryUserId && process.env.NODE_ENV !== "production"
      ? getDevUserId()
      : null;
  const userId = queryUserId || devUserId;

  // If we *still* don't have a user, show the same lookup gate
  if (!userId) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />
        <section className="mt-2">
          <PlayerLookupGate orgId={orgId} />
        </section>
      </div>
    );
  }

  // 🔍 Load player to see if Signal Lock is already completed
  const player = await getPlayer(orgId, userId);
  const hasCompleted =
    (player as any)?.specialEvents?.signalLockCompleted === true;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgId} />

      <div className="flex items-center justify-between text-[11px] text-sky-300/80">
        <span>
          Tutorial for player:{" "}
          <span className="font-mono text-sky-100">{userId}</span>
        </span>
        <Link
          href="/bitgalaxy"
          className="rounded-full border border-sky-500/40 px-2 py-1 text-[10px] hover:bg-sky-500/10"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="rounded-2xl border border-sky-500/40 bg-slate-950/85 p-4 shadow-[0_0_30px_rgba(56,189,248,0.4)]">
        {hasCompleted ? (
          <div className="space-y-2 text-sm text-sky-100">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300">
              Signal Lock · Cleared
            </p>
            <h2 className="text-lg font-semibold text-emerald-100">
              You&apos;ve already cracked this signal.
            </h2>
            <p className="text-sky-200/85 text-[13px]">
              This mission is one-time only for this world. Your XP has been
              logged to your BitGalaxy dashboard. Check your rank progression to
              see how far it pushed you.
            </p>
          </div>
        ) : (
          <SignalLockGame orgId={orgId} userId={userId} />
        )}
      </section>
    </div>
  );
}

// We import here so the page itself stays a server component,
// but the game logic runs in a client component.
import { SignalLockGame } from "@/components/bitgalaxy/SignalLockGame";