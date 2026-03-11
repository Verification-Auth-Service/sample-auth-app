import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./callback";
import { commitSession, getSession } from "~/services/session.server";

vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
  commitSession: vi.fn(),
}));

const originalEnv = { ...process.env };

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
  process.env.GITHUB_CLIENT_ID = "test_client_id";
  process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
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

describe("auth+/github+/callback", () => {
  it("errorパラメータがある場合はerrorページへリダイレクトする", async () => {
    const request = new Request("http://localhost/auth/github/callback?error=access_denied");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("title")).toBe("GitHub認証に失敗しました");
    expect(url.searchParams.get("message")).toBe("GitHub側で認証がキャンセルまたは拒否されました。");
    expect(url.searchParams.get("code")).toBe("access_denied");
  });

  it("codeまたはstateがない場合はerrorページへリダイレクトする", async () => {
    const request = new Request("http://localhost/auth/github/callback");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("title")).toBe("GitHub認証に失敗しました");
    expect(url.searchParams.get("message")).toBe("必要な情報（code / state）が不足しています。");
    expect(url.searchParams.get("code")).toBe("missing_params");
  });

  it("stateが一致しない場合はerrorページへリダイレクトする", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "saved_state" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=given_state");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("message")).toBe("セキュリティ検証に失敗しました。");
    expect(url.searchParams.get("code")).toBe("invalid_state");
  });

  it("code_verifierがセッションに無い場合はerrorページへリダイレクトする", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("message")).toBe("認証情報の検証に失敗しました。");
    expect(url.searchParams.get("code")).toBe("missing_verifier");
  });

  it("GitHub OAuth設定が不足している場合はerrorページへリダイレクトする", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1", "oauth:verifier": "verifier1" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("message")).toBe("サーバー側の設定が不足しています。");
    expect(url.searchParams.get("code")).toBe("missing_oauth_config");
  });

  it("トークン交換が失敗した場合はerrorページへリダイレクトする", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1", "oauth:verifier": "verifier1" }) as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ error: "invalid_grant" }),
      }),
    );

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("message")).toBe(
      "トークン交換に失敗しました。しばらくしてから再度お試しください。",
    );
    expect(url.searchParams.get("code")).toBe("token_exchange_failed");
  });

  it("access_tokenが無い場合はerrorページへリダイレクトする", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1", "oauth:verifier": "verifier1" }) as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ token_type: "bearer" }),
      }),
    );

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/error");
    expect(url.searchParams.get("message")).toBe("アクセストークンの取得に失敗しました。");
    expect(url.searchParams.get("code")).toBe("missing_access_token");
  });

  it("成功時はgithubinfoへリダイレクトし、セッションにトークンを保存する", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1", "oauth:verifier": "verifier1" }) as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "abcdef123456" }),
      }),
    );

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(302);
    const url = getLocationUrl(response);
    expect(url.pathname).toBe("/githubinfo");
    expect(response.headers.get("Set-Cookie")).toBe("cookie=1; Path=/");
  });
});
