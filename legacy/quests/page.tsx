import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { getQuests } from "@/lib/bitgalaxy/getQuests";
import QuestsClientShell from "./QuestsClientShell";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export const metadata = {
  title: "BitGalaxy – Quests",
};

type BitGalaxyQuestsPageProps = {
  searchParams: Promise<{ orgId?: string; tab?: string }>;
};

type TabKey = "active" | "available" | "side";

function tabFromSearch(v?: string | null): TabKey {
  if (v === "active" || v === "available" || v === "side") return v;
  return "available";
}

export default async function BitGalaxyQuestsPage({
  searchParams,
}: BitGalaxyQuestsPageProps) {
  const resolvedSearch = (await searchParams) ?? {};
  const orgId = resolvedSearch.orgId ?? DEFAULT_ORG_ID;
  const tab = tabFromSearch(resolvedSearch.tab);

  const quests = await getQuests(orgId, { activeOnly: true });

  // Strip Firestore timestamp fields so props are serializable
  const questsForClient = quests.map((q: any) => {
    const { createdAt, updatedAt, ...rest } = q;
    return rest;
  });

  return (
    <QuestsClientShell orgId={orgId} tab={tab} quests={questsForClient} />
  );
}