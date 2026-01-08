import crypto from "crypto";
import { NextRequest } from "next/server";

const COOKIE_NAME = "bgps";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour

function mustGetSecret() {
  const s = process.env.BITGALAXY_SESSION_SECRET;
  if (!s) throw new Error("Missing env BITGALAXY_SESSION_SECRET");
  return s;
}

type PlayerSessionPayload = {
  orgId: string;
  userId: string;
  iat: number;
  exp: number;
  nonce: string;
};

function b64urlEncode(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(input: string) {
  const pad = 4 - (input.length % 4 || 4);
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(s, "base64").toString("utf8");
}

function sign(data: string) {
  const secret = mustGetSecret();
  return b64urlEncode(crypto.createHmac("sha256", secret).update(data).digest());
}

export function mintPlayerSession(orgId: string, userId: string, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const exp = iat + MAX_AGE_SECONDS;

  const payload: PlayerSessionPayload = {
    orgId,
    userId,
    iat,
    exp,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyPlayerSession(token: string | null): PlayerSessionPayload | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  let payload: PlayerSessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload?.orgId || !payload?.userId) return null;
  if (!payload.exp || nowSec > payload.exp) return null;

  return payload;
}

export function getPlayerSessionFromReq(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  return verifyPlayerSession(token);
}

export function requirePlayerSession(req: NextRequest) {
  const s = getPlayerSessionFromReq(req);
  if (!s) {
    const err = new Error("Unauthorized: missing or invalid player session");
    (err as any).status = 401;
    throw err;
  }
  return s;
}

export const PLAYER_SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAgeSeconds: MAX_AGE_SECONDS,
};