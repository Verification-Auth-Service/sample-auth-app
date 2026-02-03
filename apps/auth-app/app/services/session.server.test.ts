import { describe, it, expect, beforeAll } from "vitest";

let getSession: typeof import("./session.server").getSession;
let commitSession: typeof import("./session.server").commitSession;
let destroySession: typeof import("./session.server").destroySession;

beforeAll(async () => {
  process.env.SESSION_SECRET = "test_secret_please_change";
  process.env.NODE_ENV = "test";

  const mod = await import("./session.server");
  ({ getSession, commitSession, destroySession } = mod);
});

describe("session.server", () => {
  it("roundtrip: set -> commit -> get reads value", async () => {
    const req1 = new Request("http://localhost/_", { headers: {} });
    const s1 = await getSession(req1);
    s1.set("count", 1);

    const setCookie = await commitSession(s1);
    expect(setCookie).toContain("__session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");

    const req2 = new Request("http://localhost/_", {
      headers: { Cookie: setCookie },
    });
    const s2 = await getSession(req2);
    expect(s2.get("count")).toBe(1);
  });

  it("destroySession invalidates cookie", async () => {
    const req1 = new Request("http://localhost/_", { headers: {} });
    const s1 = await getSession(req1);
    s1.set("x", "y");

    const destroyed = await destroySession(s1);
    expect(destroyed).toContain("__session=");
    expect(destroyed).toMatch(/Max-Age=0|Expires=/);
  });
});
