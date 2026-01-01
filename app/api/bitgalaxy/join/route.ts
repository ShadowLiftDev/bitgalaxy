import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orgId = body.orgId as string | undefined;
    const firstName = (body.firstName as string | undefined)?.trim();
    const lastName = (body.lastName as string | undefined)?.trim();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const phone = (body.phone as string | undefined)?.trim();

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First and last name are required" },
        { status: 400 },
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "At least a phone or email is required" },
        { status: 400 },
      );
    }

    const playersCol = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPlayers");

    // 🔍 Try to reuse an existing player by email/phone
    let existingSnap = null;

    if (email) {
      const byEmail = await playersCol.where("email", "==", email).limit(1).get();
      if (!byEmail.empty) {
        existingSnap = byEmail.docs[0];
      }
    }

    if (!existingSnap && phone) {
      const byPhone = await playersCol.where("phone", "==", phone).limit(1).get();
      if (!byPhone.empty) {
        existingSnap = byPhone.docs[0];
      }
    }

    if (existingSnap) {
      const existingData = existingSnap.data() as any;
      return NextResponse.json({
        success: true,
        userId: existingSnap.id,
        player: existingData,
        reused: true,
      });
    }

    // 🆕 No existing player: create a new one
    const now = FieldValue.serverTimestamp() as Timestamp;
    const docRef = playersCol.doc(); // auto-id
    const userId = docRef.id;

    const name = `${firstName} ${lastName}`.trim();

    const playerDoc = {
      userId,
      orgId,
      name,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      totalXP: 0,
      rank: "Rookie",
      activeQuestIds: [] as string[],
      completedQuestIds: [] as string[],
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(playerDoc);

    return NextResponse.json({
      success: true,
      userId,
      player: playerDoc,
      reused: false,
    });
  } catch (err: any) {
    console.error("BitGalaxy join error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create player" },
      { status: 500 },
    );
  }
}