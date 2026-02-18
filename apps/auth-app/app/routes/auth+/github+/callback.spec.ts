import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./callback";
import { getSession } from "~/services/session.server";

vi.mock("~/services/session.server", () => ({
  getSession: vi.fn(),
}));

const originalEnv = { ...process.env };

type SessionLike = {
  get: (key: string) => unknown;
};

function sessionFrom(values: Record<string, unknown>): SessionLike {
  return {
    get: (key: string) => values[key],
  };
}

async function readJson(response: Response) {
  return response.json();
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
  it("errorパラメータがある場合は400を返す", async () => {
    const request = new Request("http://localhost/auth/github/callback?error=access_denied");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "GitHub認証に失敗しました: access_denied",
    });
  });

  it("codeまたはstateがない場合は400を返す", async () => {
    const request = new Request("http://localhost/auth/github/callback");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "GitHub認証に必要な情報が不足しています。",
    });
  });

  it("stateが一致しない場合は400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "saved_state" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=given_state");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "不正な状態です。",
    });
  });

  it("code_verifierがセッションに無い場合は400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "code_verifier がセッションに見つかりません。",
    });
  });

  it("GitHub OAuth設定が不足している場合は500を返す", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    vi.mocked(getSession).mockResolvedValue(sessionFrom({ "oauth:state": "state1", "oauth:verifier": "verifier1" }) as never);

    const request = new Request("http://localhost/auth/github/callback?code=abc&state=state1");

    const response = await loader(makeArgs(request));

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({
      error: "GitHub OAuth 設定（CLIENT_ID/SECRET）が不足しています。",
    });
  });

  it("トークン交換が失敗した場合は400を返す", async () => {
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

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "GitHubトークン交換に失敗しました。",
      detail: { error: "invalid_grant" },
    });
  });

  it("access_tokenが無い場合は400を返す", async () => {
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

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      error: "access_token が取得できませんでした。",
      detail: { token_type: "bearer" },
    });
  });

  it("成功時はアクセストークンの先頭6文字を返す", async () => {
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

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      ok: true,
      accessTokenPreview: "abcdef...",
    });
  });
});
