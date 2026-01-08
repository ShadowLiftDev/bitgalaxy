import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { mintPlayerSession, PLAYER_SESSION_COOKIE } from "@/lib/bitgalaxy/playerSession";

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
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function setPlayerSessionCookie(res: NextResponse, orgId: string, userId: string) {
  res.cookies.set({
    name: PLAYER_SESSION_COOKIE.name,
    value: mintPlayerSession(orgId, userId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PLAYER_SESSION_COOKIE.maxAgeSeconds,
    // domain: ".yourdomain.com", // only if you want cross-subdomain app sharing
  });
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
        const userId = snap.docs[0].id;
        const res = NextResponse.json({ success: true, userId });
        setPlayerSessionCookie(res, orgId, userId);
        return res;
      }
    }

    // 2) Phone lookup
    if (phoneRaw) {
      const digitsAll = phoneDigitsAll(phoneRaw);
      const digits10 = last10(digitsAll);
      const e164 =
        e164USFromDigits(digitsAll) || (digits10 ? `+1${digits10}` : null);

      const candidates: Array<string> = [
        e164,
        phoneRaw.startsWith("+") ? phoneRaw : null,
        digits10,
        phoneRaw,
      ].filter(Boolean) as string[];

      for (const value of candidates) {
        const snap = await playersRef.where("phone", "==", value).limit(1).get();
        if (!snap.empty) {
          const userId = snap.docs[0].id;
          const res = NextResponse.json({ success: true, userId });
          setPlayerSessionCookie(res, orgId, userId);
          return res;
        }
      }

      // Optional mixed-schema attempts
      const altCandidates: Array<{ field: string; value: string | null }> = [
        { field: "phoneNormalized", value: digits10 },
        { field: "phoneDigits", value: digits10 },
      ];

      for (const c of altCandidates) {
        if (!c.value) continue;
        const snap = await playersRef.where(c.field, "==", c.value).limit(1).get();
        if (!snap.empty) {
          const userId = snap.docs[0].id;
          const res = NextResponse.json({ success: true, userId });
          setPlayerSessionCookie(res, orgId, userId);
          return res;
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