import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

type Params = { orgId: string };

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

    const cfgRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyConfig")
      .doc("config");

    const now = FieldValue.serverTimestamp() as Timestamp;

    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    const allowedFields = [
      "enabled",
      "theme",
      "defaultProgramId",
      "xpPerCheckin",
    ] as const;

    for (const field of allowedFields) {
      if (!(field in body)) continue;

      if (field === "xpPerCheckin") {
        let val = Number(body[field]);
        if (!Number.isFinite(val) || val < 0) val = 0;
        updateData[field] = val;
        continue;
      }

      updateData[field] = body[field];
    }

    const snap = await cfgRef.get();
    if (!snap.exists) {
      updateData["createdAt"] = now;
      await cfgRef.set(updateData);
    } else {
      await cfgRef.update(updateData);
    }

    return NextResponse.json({
      success: true,
      config: {
        orgId,
        ...updateData,
      },
    });
  } catch (error: any) {
    console.error("BitGalaxy HQ settings update error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ?? "Failed to update BitGalaxy settings",
      },
      { status: 500 },
    );
  }
}