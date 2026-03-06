import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./_index";
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

describe("resourceinfo/_index", () => {
  it("401 の場合は refresh token で再取得して自身へリダイレクトする", async () => {
    const values: Record<string, unknown> = {
      "resource:access_token": "expired",
      "resource:refresh_token": "refresh1",
    };
    vi.mocked(getSession).mockResolvedValue(sessionFrom(values) as never);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: vi.fn().mockResolvedValue({ error: "invalid_token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "new_atk",
            refresh_token: "new_rtk",
            scope: "read",
          }),
        }),
    );

    const response = await loader(makeArgs(new Request("http://localhost/resourceinfo")));
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected redirect");

    expect(response.status).toBe(302);
    const location = getLocationUrl(response);
    expect(location.pathname).toBe("/resourceinfo");
    expect(values["resource:access_token"]).toBe("new_atk");
    expect(values["resource:refresh_token"]).toBe("new_rtk");
    expect(values["resource:scope"]).toBe("read");
    expect(response.headers.get("Set-Cookie")).toBe("cookie=1; Path=/");
  });
});
