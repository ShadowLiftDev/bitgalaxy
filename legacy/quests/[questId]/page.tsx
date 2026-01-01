import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getQuest } from "@/lib/bitgalaxy/getQuest";
import QuestDetailClientShell from "./QuestDetailClientShell";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

type QuestDetailPageProps = {
  params: Promise<{ questId: string }>;
  searchParams: Promise<{ orgId?: string }>;
};

export const metadata = {
  title: "BitGalaxy – Quest Detail",
};

export default async function QuestDetailPage({
  params,
  searchParams,
}: QuestDetailPageProps) {
  const { questId } = await params;
  const resolvedSearch = (await searchParams) ?? {};

  const orgId = resolvedSearch.orgId ?? DEFAULT_ORG_ID;

  const quest = await getQuest(orgId, questId);

  if (!quest) {
    return (
      <div className="space-y-6">
        <GalaxyHeader orgName={orgId} />
        <section className="rounded-2xl border border-red-500/40 bg-slate-950/85 p-5">
          <p className="text-sm font-semibold text-red-300">
            Quest not found or no longer available.
          </p>
          <p className="mt-1 text-xs text-red-200/80">
            The mission may have been retired, moved to another world, or its ID
            is no longer valid.
          </p>
        </section>
      </div>
    );
  }

  // Strip non-serializable fields
  const { createdAt, updatedAt, ...questForClient } = quest as any;

  return (
    <QuestDetailClientShell
      orgId={orgId}
      quest={questForClient}
    />
  );
}