import crypto from "crypto";
import { NextRequest } from "next/server";

const COOKIE_NAME = "bgps";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour
const MAX_FUTURE_IAT_SKEW_SECONDS = 60;

function mustGetSecret(): string {
  const secret = process.env.BITGALAXY_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing env BITGALAXY_SESSION_SECRET");
  }

  return secret;
}

export type PlayerSessionPayload = {
  orgId: string;
  memberId: string;
  iat: number;
  exp: number;
  nonce: string;
};

function b64urlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): string {
  const paddingLength = (4 - (input.length % 4)) % 4;

  const normalized =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat(paddingLength);

  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(data: string): string {
  return b64urlEncode(
    crypto
      .createHmac("sha256", mustGetSecret())
      .update(data)
      .digest(),
  );
}

function isPlayerSessionPayload(
  value: unknown,
): value is PlayerSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<PlayerSessionPayload>;

  return (
    typeof payload.orgId === "string" &&
    payload.orgId.trim().length > 0 &&
    typeof payload.memberId === "string" &&
    payload.memberId.trim().length > 0 &&
    typeof payload.iat === "number" &&
    Number.isFinite(payload.iat) &&
    typeof payload.exp === "number" &&
    Number.isFinite(payload.exp) &&
    typeof payload.nonce === "string" &&
    payload.nonce.length > 0
  );
}

export function mintPlayerSession(
  orgId: string,
  memberId: string,
  now = Date.now(),
): string {
  const normalizedOrgId = orgId.trim();
  const normalizedMemberId = memberId.trim();

  if (!normalizedOrgId) {
    throw new Error("mintPlayerSession: orgId is required");
  }

  if (!normalizedMemberId) {
    throw new Error("mintPlayerSession: memberId is required");
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + MAX_AGE_SECONDS;

  const payload: PlayerSessionPayload = {
    orgId: normalizedOrgId,
    memberId: normalizedMemberId,
    iat,
    exp,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);

  return `${payloadB64}.${signature}`;
}

export function verifyPlayerSession(
  token: string | null,
): PlayerSessionPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;

  if (!payloadB64 || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadB64);

  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  let decodedPayload: unknown;

  try {
    decodedPayload = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }

  if (!isPlayerSessionPayload(decodedPayload)) {
    return null;
  }

  const payload: PlayerSessionPayload = {
    ...decodedPayload,
    orgId: decodedPayload.orgId.trim(),
    memberId: decodedPayload.memberId.trim(),
  };

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp <= payload.iat) {
    return null;
  }

  if (nowSeconds >= payload.exp) {
    return null;
  }

  if (payload.iat > nowSeconds + MAX_FUTURE_IAT_SKEW_SECONDS) {
    return null;
  }

  return payload;
}

export function getPlayerSessionFromReq(
  req: NextRequest,
): PlayerSessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;

  return verifyPlayerSession(token);
}

export function requirePlayerSession(
  req: NextRequest,
): PlayerSessionPayload {
  const session = getPlayerSessionFromReq(req);

  if (!session) {
    const error = new Error(
      "Unauthorized: missing or invalid BitGalaxy member session",
    ) as Error & {
      status?: number;
    };

    error.status = 401;
    throw error;
  }

  return session;
}

export const PLAYER_SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAgeSeconds: MAX_AGE_SECONDS,
} as const;