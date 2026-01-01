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

    // ProgramForm sends "programId"; keep "id" as a fallback
    const programId =
      (body.programId as string | undefined) ??
      (body.id as string | undefined);

    if (!programId) {
      return NextResponse.json(
        { error: "Program id (programId or id) is required" },
        { status: 400 },
      );
    }

    const programRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPrograms")
      .doc(programId);

    const now = FieldValue.serverTimestamp() as Timestamp;

    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    const allowedFields = [
      "name",
      "description",
      "startAt",
      "endAt",
      "isActive",
      "xpMultiplier",
      "questIds",
      "displayOrder",
    ];

    for (const field of allowedFields) {
      if (!(field in body)) continue;

      const value = body[field];

      if (field === "startAt" || field === "endAt") {
        updateData[field] =
          value && typeof value === "string"
            ? Timestamp.fromDate(new Date(value))
            : null;
        continue;
      }

      if (field === "xpMultiplier") {
        updateData[field] = Number(value);
        continue;
      }

      if (field === "displayOrder") {
        updateData[field] = Number(value);
        continue;
      }

      if (field === "questIds") {
        updateData[field] = Array.isArray(value) ? value : [];
        continue;
      }

      updateData[field] = value;
    }

    await programRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("BitGalaxy HQ update program error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update program" },
      { status: 500 },
    );
  }
}
