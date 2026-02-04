import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function randomString(bytes = 32): string {
  if (bytes < 1) throw new Error("bytes must be >= 1");
  return base64UrlEncode(randomBytes(bytes));
}

export function sha256Base64Url(input: string): string {
  const hash = createHash("sha256").update(input).digest();
  return base64UrlEncode(hash);
}

export function createCodeVerifier(): string {
  // 32 bytes -> 43 chars (base64url), within PKCE 43-128 requirement
  return randomString(32);
}

export function createCodeChallenge(verifier: string): string {
  return sha256Base64Url(verifier);
}

export function createState(): string {
  return randomString(16);
}

export function createCsrfToken(): string {
  return randomString(16);
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
