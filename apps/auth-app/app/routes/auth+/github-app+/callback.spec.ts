import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./callback";
import { commitSession, getSession } from "~/services/session.server";
import { prisma } from "@sample-auth-app/db";

vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
  commitSession: vi.fn(),
}));

vi.mock("@sample-auth-app/db", () => ({
  prisma: {
    oAuthAccount: {
      upsert: vi.fn(),
    },
  },
}));

const originalEnv = { ...process.env };

type SessionLike = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  unset: (key: string) => void;
};

function sessionFrom(values: Record<string, unknown>): SessionLike {
  return {
    get: (key: string) => values[key],
    set: (key: string, value: unknown) => {
      values[key] = value;
    },
    unset: (key: string) => {
      delete values[key];
    },
  };
}

function getLocationUrl(response: Response) {
  const location = response.headers.get("Location");
  if (!location) throw new Error("Missing Location header");
  return new URL(location, "http://localhost");
}

function makeArgs(request: Request): LoaderFunctionArgs {
  return {
    request,
    params: {},
    context: {},
    unstable_pattern: "",
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.GITHUB_APP_CLIENT_ID = "test_client_id";
  process.env.GITHUB_APP_CLIENT_SECRET = "test_client_secret";
  vi.mocked(commitSession).mockResolvedValue("cookie=1; Path=/");
  vi.mocked(prisma.oAuthAccount.upsert).mockResolvedValue({ id: "account1" } as never);
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

describe("auth+/github-app+/callback", () => {
  it("refresh_tokenがある場合はセッションに保存する", async () => {
    const sessionValues: Record<string, unknown> = { "oauth:state": "state1", "oauth:verifier": "verifier1" };
    vi.mocked(getSession).mockResolvedValue(sessionFrom(sessionValues) as never);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: "abcdef123456", refresh_token: "refresh987654", expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: 123 }),
        }),
    );

    const request = new Request("http://localhost/auth/github-app/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/githubinfo");
    expect(response.headers.get("Set-Cookie")).toBe("cookie=1; Path=/");
    expect(sessionValues["github:access_token"]).toBe("abcdef123456");
    expect(sessionValues["github:refresh_token"]).toBe("refresh987654");
    expect(sessionValues["github:auth_type"]).toBe("github_app");
    expect(prisma.oAuthAccount.upsert).toHaveBeenCalledTimes(1);
  });
});
