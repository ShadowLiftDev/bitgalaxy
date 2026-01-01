import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

type Params = { orgId: string };

interface NormalizedRewardMapping {
  xpThreshold: number;
  rewardId: string | null;
  label: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> },
) {
  try {
    const { orgId } = await ctx.params;

    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId in route" },
        { status: 400 },
      );
    }

    // --- AUTH ---
    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const body = await req.json();

    const rawMappings = Array.isArray(body.mappings) ? body.mappings : [];

    // Normalize + filter mappings (no fancy TS tricks)
    const normalized: NormalizedRewardMapping[] = [];

    for (const m of rawMappings) {
      const xpThreshold = Number(m?.xpThreshold ?? 0);
      const rewardId =
        typeof m?.rewardId === "string" && m.rewardId.trim() !== ""
          ? m.rewardId.trim()
          : null;
      const label = typeof m?.label === "string" ? m.label.trim() : "";

      // Skip invalid rows
      if (!Number.isFinite(xpThreshold) || xpThreshold < 0) continue;
      if (!rewardId && !label) continue; // completely empty row

      normalized.push({
        xpThreshold,
        rewardId,
        label,
      });
    }

    // Sort ascending by threshold for predictable UI ordering
    normalized.sort((a, b) => a.xpThreshold - b.xpThreshold);

    const colRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyRewardsMap");

    // v1: overwrite collection
    const existing = await colRef.get();
    const batch = adminDb.batch();

    existing.forEach((doc) => batch.delete(doc.ref));

    const now = FieldValue.serverTimestamp() as Timestamp;

    for (const mapping of normalized) {
      const docRef = colRef.doc();
      batch.set(docRef, {
        xpThreshold: mapping.xpThreshold,
        rewardId: mapping.rewardId,
        label: mapping.label,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      mappings: normalized,
    });
  } catch (error: any) {
    console.error("BitGalaxy HQ rewards map error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update reward map" },
      { status: 500 },
    );
  }
}