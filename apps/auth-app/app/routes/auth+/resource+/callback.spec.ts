import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./callback";
import { commitSession, getSession } from "~/services/session.server";

vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
  commitSession: vi.fn(),
}));

type SessionLike = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

function sessionFrom(values: Record<string, unknown>): SessionLike {
  return {
    get: (key: string) => values[key],
    set: (key: string, value: unknown) => {
      values[key] = value;
    },
  };
}

function makeArgs(request: Request): LoaderFunctionArgs {
  return {
    request,
    params: {},
    context: {},
    unstable_pattern: "",
  };
}

function getLocationUrl(response: Response) {
  const location = response.headers.get("Location");
  if (!location) throw new Error("Missing Location header");
  return new URL(location, "http://localhost");
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(commitSession).mockResolvedValue("cookie=1; Path=/");
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

describe("auth+/resource+/callback", () => {
  it("state mismatch の場合は error ページへ遷移する", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "resource:oauth:state": "saved" }) as never);

    const request = new Request("http://localhost/auth/resource/callback?code=abc&state=given");
    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("code")).toBe("invalid_state");
  });

  it("成功時は resourceinfo へ遷移し token を保存する", async () => {
    const values: Record<string, unknown> = { "resource:oauth:state": "state1" };
    vi.mocked(getSession).mockResolvedValue(sessionFrom(values) as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "atk1",
          refresh_token: "rtk1",
          scope: "read",
        }),
      }),
    );

    const request = new Request("http://localhost/auth/resource/callback?code=abc&state=state1");
    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/resourceinfo");
    expect(values["resource:access_token"]).toBe("atk1");
    expect(values["resource:refresh_token"]).toBe("rtk1");
    expect(values["resource:scope"]).toBe("read");
    expect(response.headers.get("Set-Cookie")).toBe("cookie=1; Path=/");
  });
});
