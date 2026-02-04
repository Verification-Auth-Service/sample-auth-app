import { describe, expect, it } from "vitest";
import { createCodeChallenge, createCodeVerifier, createCsrfToken, createState, randomString, safeEqual } from "./crypto.server";

describe("crypto.server", () => {
  it("randomString returns urlsafe string", () => {
    // URLセーフなBase64（base64url）になっているか
    const v = randomString(32);
    expect(v.length).toBe(43);
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("createCodeVerifier returns valid length", () => {
    // PKCEの許容長（43-128）の範囲内か
    const v = createCodeVerifier();
    expect(v.length).toBe(43);
  });

  it("createCodeChallenge matches sha256 base64url of verifier", () => {
    // 既知入力でのSHA-256 + base64url の期待値
    const challenge = createCodeChallenge("abc");
    expect(challenge).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });

  it("createState/createCsrfToken return non-empty tokens", () => {
    // CSRF/Stateは空でないこと
    expect(createState().length).toBeGreaterThan(0);
    expect(createCsrfToken().length).toBeGreaterThan(0);
  });

  it("safeEqual compares in constant time for equal strings", () => {
    // 同値/非同値の基本挙動
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "b")).toBe(false);
  });
});
