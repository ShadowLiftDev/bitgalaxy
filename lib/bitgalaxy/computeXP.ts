import type { BitGalaxyProgram } from "./getPrograms";

export interface ComputeXPContext {
  baseXP: number;              // quest.xp
  program?: BitGalaxyProgram | null;
  globalMultiplier?: number;   // from config, promos, etc.
  capPerQuest?: number | null; // optional safety cap
}

export function computeXP(ctx: ComputeXPContext): number {
  const base = Math.max(0, Math.floor(ctx.baseXP || 0));

  const programMultiplier =
    ctx.program?.xpMultiplier && ctx.program.xpMultiplier > 0
      ? ctx.program.xpMultiplier
      : 1;

  const globalMultiplier =
    ctx.globalMultiplier && ctx.globalMultiplier > 0
      ? ctx.globalMultiplier
      : 1;

  let xp = base * programMultiplier * globalMultiplier;

  if (ctx.capPerQuest != null && ctx.capPerQuest > 0) {
    xp = Math.min(xp, ctx.capPerQuest);
  }

  xp = Math.floor(xp);
  if (!Number.isFinite(xp) || xp < 0) xp = 0;

  return xp;
}