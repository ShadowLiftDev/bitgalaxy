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

    const programsCol = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPrograms");

    const now = FieldValue.serverTimestamp() as Timestamp;
    const docRef = programsCol.doc();

    const startAt =
      body.startAt && typeof body.startAt === "string"
        ? Timestamp.fromDate(new Date(body.startAt))
        : now;

    const endAt =
      body.endAt && typeof body.endAt === "string"
        ? Timestamp.fromDate(new Date(body.endAt))
        : now;

    const programData = {
      name: body.name ?? "Untitled Program",
      description: body.description ?? "",
      startAt,
      endAt,
      isActive: body.isActive ?? true,
      xpMultiplier: Number(body.xpMultiplier ?? 1),
      questIds: Array.isArray(body.questIds) ? body.questIds : [],
      displayOrder: Number(body.displayOrder ?? 0),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(programData);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error("BitGalaxy HQ create program error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create program" },
      { status: 500 },
    );
  }
}