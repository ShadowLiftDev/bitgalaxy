import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  mintPlayerSession,
  PLAYER_SESSION_COOKIE,
} from "@/lib/bitgalaxy/playerSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LookupPlayerBody = {
  orgId?: string;
  email?: string;
  phone?: string;
};

type MemberMatch = {
  memberId: string;
  displayName: string;
};

type MemberLookupField =
  | "emailNormalized"
  | "email"
  | "phoneE164"
  | "phoneDigits"
  | "phoneNormalized"
  | "phone";

function normalizeEmail(value?: string): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  return normalized || null;
}

function normalizePhoneDigits(value?: string): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits || null;
}

function getLastTenDigits(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.length > 10 ? value.slice(-10) : value;
}

function toUsE164(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.length === 10) {
    return `+1${value}`;
  }

  if (value.length === 11 && value.startsWith("1")) {
    return `+${value}`;
  }

  return null;
}

function normalizeDisplayName(
  memberId: string,
  data: FirebaseFirestore.DocumentData,
): string {
  const candidates = [
    data.displayName,
    data.name,
    data.fullName,
    data.firstName && data.lastName
      ? `${String(data.firstName)} ${String(data.lastName)}`
      : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = candidate.trim();

    if (normalized) {
      return normalized;
    }
  }

  return `Member ${memberId.slice(0, 6)}`;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter(Boolean),
    ),
  );
}

function setPlayerSessionCookie(
  response: NextResponse,
  orgId: string,
  memberId: string,
) {
  response.cookies.set({
    name: PLAYER_SESSION_COOKIE.name,
    value: mintPlayerSession(orgId, memberId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PLAYER_SESSION_COOKIE.maxAgeSeconds,
  });
}

async function memberHasOrgLink(
  memberId: string,
  orgId: string,
): Promise<boolean> {
  const orgLinkSnap = await adminDb
    .collection("members")
    .doc(memberId)
    .collection("orgLinks")
    .doc(orgId)
    .get();

  return orgLinkSnap.exists;
}

async function findConnectedMemberByField(
  orgId: string,
  field: MemberLookupField,
  value: string,
): Promise<MemberMatch | null> {
  const snapshot = await adminDb
    .collection("members")
    .where(field, "==", value)
    .limit(10)
    .get();

  if (snapshot.empty) {
    return null;
  }

  for (const memberDoc of snapshot.docs) {
    const belongsToOrg = await memberHasOrgLink(memberDoc.id, orgId);

    if (!belongsToOrg) {
      continue;
    }

    const data = memberDoc.data();

    return {
      memberId: memberDoc.id,
      displayName: normalizeDisplayName(memberDoc.id, data),
    };
  }

  return null;
}

async function findConnectedMemberByEmail(
  orgId: string,
  email: string,
): Promise<MemberMatch | null> {
  const emailLookups: Array<{
    field: MemberLookupField;
    value: string;
  }> = [
    {
      field: "emailNormalized",
      value: email,
    },
    {
      field: "email",
      value: email,
    },
  ];

  for (const lookup of emailLookups) {
    const match = await findConnectedMemberByField(
      orgId,
      lookup.field,
      lookup.value,
    );

    if (match) {
      return match;
    }
  }

  return null;
}

async function findConnectedMemberByPhone(
  orgId: string,
  phoneRaw: string,
): Promise<MemberMatch | null> {
  const digitsAll = normalizePhoneDigits(phoneRaw);
  const digits10 = getLastTenDigits(digitsAll);
  const e164 =
    toUsE164(digitsAll) ??
    (digits10 ? `+1${digits10}` : null);

  const normalizedRawPhone = phoneRaw.trim();

  const lookupValues: Array<{
    field: MemberLookupField;
    value: string;
  }> = [];

  for (const value of uniqueStrings([e164])) {
    lookupValues.push({
      field: "phoneE164",
      value,
    });
  }

  for (const value of uniqueStrings([digits10, digitsAll])) {
    lookupValues.push({
      field: "phoneDigits",
      value,
    });
  }

  for (const value of uniqueStrings([
    digits10,
    digitsAll,
    e164,
  ])) {
    lookupValues.push({
      field: "phoneNormalized",
      value,
    });
  }

  for (const value of uniqueStrings([
    e164,
    normalizedRawPhone.startsWith("+")
      ? normalizedRawPhone
      : null,
    digits10,
    digitsAll,
    normalizedRawPhone,
  ])) {
    lookupValues.push({
      field: "phone",
      value,
    });
  }

  for (const lookup of lookupValues) {
    const match = await findConnectedMemberByField(
      orgId,
      lookup.field,
      lookup.value,
    );

    if (match) {
      return match;
    }
  }

  return null;
}

function createMemberFoundResponse(
  orgId: string,
  member: MemberMatch,
): NextResponse {
  const response = NextResponse.json({
    success: true,
    memberId: member.memberId,
    member: {
      memberId: member.memberId,
      displayName: member.displayName,
    },
  });

  setPlayerSessionCookie(response, orgId, member.memberId);

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as LookupPlayerBody | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid JSON request body is required.",
        },
        { status: 400 },
      );
    }

    const orgId = body.orgId?.trim() ?? "";
    const email = normalizeEmail(body.email);
    const phoneRaw = body.phone?.trim() ?? "";

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orgId.",
        },
        { status: 400 },
      );
    }

    if (!email && !phoneRaw) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide either an email or phone number to locate your member profile.",
        },
        { status: 400 },
      );
    }

    if (email && phoneRaw) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide either an email or phone number, but not both.",
        },
        { status: 400 },
      );
    }

    const member = email
      ? await findConnectedMemberByEmail(orgId, email)
      : await findConnectedMemberByPhone(orgId, phoneRaw);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          code: "MEMBER_NOT_FOUND",
          error:
            "No member connected to this organization was found with that email or phone number.",
        },
        { status: 404 },
      );
    }

    return createMemberFoundResponse(orgId, member);
  } catch (error: unknown) {
    console.error("[bitgalaxy:lookup-player:POST]", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error locating your member profile.",
      },
      { status: 500 },
    );
  }
}