import { GalaxyHeader } from "@/components/bitgalaxy/GalaxyHeader";
import { PlayerSettingsPanel } from "./PlayerSettingsPanel";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export const metadata = {
  title: "BitGalaxy – Settings",
};

export default function BitGalaxySettingsPage() {
  const orgName = DEFAULT_ORG_ID;

  return (
    <div className="space-y-6">
      <GalaxyHeader orgName={orgName} />
      <PlayerSettingsPanel />
    </div>
  );
}