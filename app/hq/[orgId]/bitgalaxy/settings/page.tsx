import {
  BitGalaxySettingsForm,
  type BitGalaxySettingsInitial,
  type BitGalaxyStatus,
  type BitGalaxyTheme,
} from "@/components/bitgalaxy/admin/BitGalaxySettingsForm";
import { adminDb } from "@/lib/firebase-admin";

type OrgParams = {
  orgId: string;
};

type BitGalaxySettingsPageProps = {
  params: Promise<OrgParams>;
};

export const metadata = {
  title: "BitGalaxy · Settings",
};

async function getSettings(
  orgId: string,
): Promise<BitGalaxySettingsInitial> {
  const orgRef = adminDb
    .collection("orgs")
    .doc(orgId);

  const [orgSnapshot, configSnapshot] =
    await Promise.all([
      orgRef.get(),

      orgRef
        .collection("modules")
        .doc("bitgalaxy")
        .collection("config")
        .doc("current")
        .get(),
    ]);

  const orgData =
    orgSnapshot.data() ?? {};

  const configData =
    configSnapshot.data() ?? {};

  return {
    status: normalizeStatus(
      configData.status,
    ),

    theme: normalizeTheme(
      configData.theme,
    ),

    allowPublicAccess:
      configData.allowPublicAccess === true,

    allowPublicJoin:
      configData.allowPublicJoin === true,

    allowGuestMode:
      configData.allowGuestMode === true,

    allowLeaderboard:
      configData.allowLeaderboard === true,

    worldName:
      normalizeOptionalString(
        configData.worldName,
      ) ??
      normalizeOptionalString(
        orgData.displayName,
      ) ??
      normalizeOptionalString(
        orgData.name,
      ) ??
      orgId,

    publicHeadline:
      normalizeOptionalString(
        configData.publicHeadline,
      ) ?? "",

    publicDescription:
      normalizeOptionalString(
        configData.publicDescription,
      ) ?? "",

    locationLabel:
      normalizeOptionalString(
        configData.locationLabel,
      ) ?? "",

    logoUrl:
      normalizeOptionalString(
        configData.logoUrl,
      ) ??
      normalizeOptionalString(
        orgData.logoUrl,
      ) ??
      normalizeOptionalString(
        orgData.branding?.logoUrl,
      ) ??
      "",

    xpPerCheckin:
      normalizeNonNegativeInteger(
        configData.xpPerCheckin,
        0,
      ),

    defaultGameCompletionXp:
      normalizeNonNegativeInteger(
        configData.defaultGameCompletionXp,
        50,
      ),

    defaultProgramId:
      normalizeOptionalString(
        configData.defaultProgramId,
      ),
  };
}

export default async function BitGalaxySettingsPage({
  params,
}: BitGalaxySettingsPageProps) {
  const { orgId } = await params;

  const decodedOrgId =
    decodeURIComponent(orgId).trim();

  if (!decodedOrgId) {
    throw new Error(
      "BitGalaxy settings requires a valid organization ID.",
    );
  }

  const initial = await getSettings(
    decodedOrgId,
  );

  const configPath =
    `orgs/${decodedOrgId}/modules/bitgalaxy/config/current`;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />

            World Engine Config
          </div>

          <h1 className="mt-2 text-sm font-semibold text-sky-50">
            BitGalaxy Settings
          </h1>

          <p className="text-xs text-sky-100/85">
            Configure this organization&apos;s public world,
            access rules, visual identity, and XP defaults.
          </p>
        </div>

        <div className="max-w-full rounded-xl border border-sky-500/40 bg-slate-950/80 px-3 py-2 text-[11px] text-sky-200">
          <div className="break-all font-mono text-[10px] text-sky-300/80">
            {configPath}
          </div>

          <div className="mt-1 text-[10px] text-sky-300/80">
            Canonical configuration used by worlds, quests,
            check-ins, leaderboards, and arcade games.
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-sky-500/40 bg-slate-950/90 p-4 shadow-[0_0_36px_rgba(56,189,248,0.4)]">
        <BitGalaxySettingsForm
          orgId={decodedOrgId}
          initial={initial}
        />
      </section>
    </div>
  );
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeStatus(
  value: unknown,
): BitGalaxyStatus {
  return value === "active"
    ? "active"
    : "inactive";
}

function normalizeTheme(
  value: unknown,
): BitGalaxyTheme {
  if (
    value === "retro" ||
    value === "cyber"
  ) {
    return value;
  }

  return "neon";
}