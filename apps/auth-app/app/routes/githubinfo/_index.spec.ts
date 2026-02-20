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
  process.env.GITHUB_APP_CLIENT_ID = "test_client_id";
  process.env.GITHUB_APP_CLIENT_SECRET = "test_client_secret";
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

describe("githubinfo/_index", () => {
  it("401時にrefresh_tokenでaccess_tokenを再取得してgithubinfoへリダイレクトする", async () => {
    const sessionValues: Record<string, unknown> = {
      "github:access_token": "expired_access",
      "github:refresh_token": "refresh123",
      "github:auth_type": "github_app",
    };
    vi.mocked(getSession).mockResolvedValue(sessionFrom(sessionValues) as never);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: "new_access", refresh_token: "new_refresh" }),
        }),
    );

    const request = new Request("http://localhost/githubinfo");
    const response = await loader(makeArgs(request));
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected redirect response");

    expect(response.status).toBe(302);
    const location = getLocationUrl(response);
    expect(location.pathname).toBe("/githubinfo");
    expect(response.headers.get("Set-Cookie")).toBe("cookie=1; Path=/");
    expect(sessionValues["github:access_token"]).toBe("new_access");
    expect(sessionValues["github:refresh_token"]).toBe("new_refresh");
    expect(commitSession).toHaveBeenCalledTimes(1);
  });

  it("oauth_app認証ではrefresh_token更新せずエラーページへ遷移する", async () => {
    const sessionValues: Record<string, unknown> = {
      "github:access_token": "expired_access",
      "github:refresh_token": "refresh123",
      "github:auth_type": "oauth_app",
    };
    vi.mocked(getSession).mockResolvedValue(sessionFrom(sessionValues) as never);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/githubinfo");
    const response = await loader(makeArgs(request));
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected redirect response");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(commitSession).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    const location = getLocationUrl(response);
    expect(location.pathname).toBe("/error");
    expect(location.searchParams.get("code")).toBe("github_repos_failed");
  });
});
