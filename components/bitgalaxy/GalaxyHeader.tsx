type GalaxyHeaderProps = {
  orgName?: string;
};

export function GalaxyHeader({ orgName }: GalaxyHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight text-sky-100">
        BitGalaxy
      </h1>
      <p className="text-sm text-sky-300/80">
        {orgName
          ? `Exploring the ${orgName} universe.`
          : "Earn XP, climb ranks, and unlock rewards across the Neon universe."}
      </p>
    </header>
  );
}