import { createHmac } from "node:crypto";
import { env } from "@secured_attendance/env/server";

const MASTER_SECRET = env.QR_SIGNING_SECRET 
  ? Buffer.from(env.QR_SIGNING_SECRET, "base64")
  : Buffer.from(crypto.getRandomValues(new Uint8Array(32))); // Fallback for dev

export interface QrPayload {
  sid: string;
  nonce: string;
  iat: number;
  exp: number;
}

export function deriveSessionKey(sessionId: string): Buffer {
  const hmac = createHmac("sha256", MASTER_SECRET);
  hmac.update(`session:${sessionId}`);
  return hmac.digest();
}


export function generateQrToken(sessionId: string, sessionKey: Buffer): {
  token: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
} {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10; 

  const payload = JSON.stringify({ sid: sessionId, nonce, iat, exp });
  const payloadB64 = Buffer.from(payload).toString("base64url");

  const hmac = createHmac("sha256", sessionKey);
  hmac.update(payloadB64);
  const signature = hmac.digest("base64url");

  return {
    token: `${payloadB64}.${signature}`,
    nonce,
    issuedAt: iat,
    expiresAt: exp,
  };
}

export function verifyQrToken(
  token: string,
  sessionKey: Buffer
): { valid: true; payload: QrPayload } | { valid: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return { valid: false, reason: "malformed" };

  const hmac = createHmac("sha256", sessionKey);
  hmac.update(payloadB64);
  const expected = hmac.digest("base64url");

  if (signature !== expected) return { valid: false, reason: "invalid_signature" };

  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as QrPayload;
  } catch (e) {
    return { valid: false, reason: "malformed_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { valid: false, reason: "expired" };

  return { valid: true, payload };
}
