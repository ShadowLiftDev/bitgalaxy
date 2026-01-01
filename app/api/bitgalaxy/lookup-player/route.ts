import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  orgId: string;
  email?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const orgId = body.orgId?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Missing orgId" },
        { status: 400 },
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either an email or a phone number to look up a player.",
        },
        { status: 400 },
      );
    }

    const playersRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPlayers");

    let userId: string | null = null;

    // 1) Try email match if provided
    if (email) {
      const emailSnap = await playersRef
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailSnap.empty) {
        userId = emailSnap.docs[0].id;
      }
    }

    // 2) If still not found, try phone match if provided
    if (!userId && phone) {
      const raw = phone;
      const normalized = phone.replace(/\D/g, "");

      // TODO: adjust "phone" to match your schema (e.g. "phoneDigits" or "phoneE164")
      const phoneField = "phone";

      // Try normalized first
      let phoneSnap = await playersRef
        .where(phoneField, "==", normalized)
        .limit(1)
        .get();

      // If nothing, try raw
      if (phoneSnap.empty) {
        phoneSnap = await playersRef
          .where(phoneField, "==", raw)
          .limit(1)
          .get();
      }

      if (!phoneSnap.empty) {
        userId = phoneSnap.docs[0].id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No BitGalaxy player found with that email/phone in this world. Ask staff to confirm which contact info is on file.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      userId,
    });
  } catch (err: any) {
    console.error("BitGalaxy lookup-player error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error looking up player.",
      },
      { status: 500 },
    );
  }
}