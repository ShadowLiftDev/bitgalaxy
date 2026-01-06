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

function normalizeEmail(email?: string) {
  const e = (email ?? "").trim().toLowerCase();
  return e || null;
}

function phoneDigitsAll(phone?: string) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  return digits || null;
}

function last10(digits?: string | null) {
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function e164USFromDigits(digits?: string | null) {
  if (!digits) return null;

  // 10 digits => assume US
  if (digits.length === 10) return `+1${digits}`;

  // 11 digits starting with 1 => US with country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const orgId = body.orgId?.trim();
    const email = normalizeEmail(body.email);
    const phoneRaw = (body.phone ?? "").trim();

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Missing orgId" },
        { status: 400 },
      );
    }

    if (!email && !phoneRaw) {
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

    // 1) Email lookup
    if (email) {
      const snap = await playersRef.where("email", "==", email).limit(1).get();
      if (!snap.empty) {
        return NextResponse.json({ success: true, userId: snap.docs[0].id });
      }
    }

    // 2) Phone lookup
    if (phoneRaw) {
      const digitsAll = phoneDigitsAll(phoneRaw);
      const digits10 = last10(digitsAll);

      // If digitsAll is 11 and starts with 1, or is 10 digits, this yields +1...
      const e164 =
        e164USFromDigits(digitsAll) || (digits10 ? `+1${digits10}` : null);

      const candidates: Array<string> = [
        // Key fix: match stored "+1555..." from "555..."
        e164,

        // If user typed +1555... exactly, try it too
        phoneRaw.startsWith("+") ? phoneRaw : null,

        // Legacy/exact attempts
        digits10,
        phoneRaw,
      ].filter(Boolean) as string[];

      for (const value of candidates) {
        const snap = await playersRef.where("phone", "==", value).limit(1).get();
        if (!snap.empty) {
          return NextResponse.json({ success: true, userId: snap.docs[0].id });
        }
      }

      // Optional: keep these if you *might* have mixed schemas
      // (safe to keep; they just cost extra queries)
      const altCandidates: Array<{ field: string; value: string | null }> = [
        { field: "phoneNormalized", value: digits10 },
        { field: "phoneDigits", value: digits10 },
      ];

      for (const c of altCandidates) {
        if (!c.value) continue;
        const snap = await playersRef.where(c.field, "==", c.value).limit(1).get();
        if (!snap.empty) {
          return NextResponse.json({ success: true, userId: snap.docs[0].id });
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "No BitGalaxy player found with that email/phone in this world. Ask staff to confirm which contact info is on file.",
      },
      { status: 404 },
    );
  } catch (err: any) {
    console.error("BitGalaxy lookup-player error:", err);
    return NextResponse.json(
      { success: false, error: "Unexpected error looking up player." },
      { status: 500 },
    );
  }
}