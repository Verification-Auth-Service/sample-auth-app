import { describe, it, expect } from "vitest";
import { createAppSessionStorage } from "./session.server";

const sessionStorage = createAppSessionStorage({
  sessionSecret: "test_secret_please_change",
  nodeEnv: "test",
});

describe("session.server", () => {
  it("roundtrip: set -> commit -> get reads value", async () => {
    const req1 = new Request("http://localhost/_", { headers: {} });
    const s1 = await sessionStorage.getSession(req1.headers.get("Cookie"));
    s1.set("count", 1);

    const setCookie = await sessionStorage.commitSession(s1);
    expect(setCookie).toContain("__session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");

    const req2 = new Request("http://localhost/_", {
      headers: { Cookie: setCookie },
    });
    const s2 = await sessionStorage.getSession(req2.headers.get("Cookie"));
    expect(s2.get("count")).toBe(1);
  });

  it("destroySession invalidates cookie", async () => {
    const req1 = new Request("http://localhost/_", { headers: {} });
    const s1 = await sessionStorage.getSession(req1.headers.get("Cookie"));
    s1.set("x", "y");

    const destroyed = await sessionStorage.destroySession(s1);
    expect(destroyed).toContain("__session=");
    expect(destroyed).toMatch(/Max-Age=0|Expires=/);
  });
});

describe("oauth temp data in session", () => {
  const storage = createAppSessionStorage({ secret: "test_secret" });

  it("roundtrip: oauth:* keys survive commit", async () => {
    const s1 = await storage.getSession(null);
    s1.set("oauth:state", "state1");
    s1.set("oauth:verifier", "verifier1");
    s1.set("oauth:createdAt", 123);

    const setCookie = await storage.commitSession(s1, { maxAge: 600 });
    const cookiePair = setCookie.split(";")[0];

    const s2 = await storage.getSession(cookiePair);
    expect(s2.get("oauth:state")).toBe("state1");
    expect(s2.get("oauth:verifier")).toBe("verifier1");
    expect(s2.get("oauth:createdAt")).toBe(123);

    // 文字列として、maxAge が反映されてること
    expect(setCookie).toMatch(/Max-Age=600/);
  });
});
