import type { ActionFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { action } from "./oauth.token";
import {
  consumeAuthorizationCode,
  issueTokens,
  rotateAccessTokenByRefreshToken,
  validateClientCredentials,
  validateRedirectUri,
} from "~/services/oauth.server";

vi.mock("~/services/oauth.server", () => ({
  validateClientCredentials: vi.fn(),
  validateRedirectUri: vi.fn(),
  consumeAuthorizationCode: vi.fn(),
  issueTokens: vi.fn(),
  rotateAccessTokenByRefreshToken: vi.fn(),
}));

function makeArgs(request: Request): ActionFunctionArgs {
  return {
    request,
    params: {},
    context: {},
    unstable_pattern: "",
  };
}

function makeFormRequest(body: URLSearchParams) {
  return new Request("http://localhost/oauth/token", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

async function unwrapRouteResult(result: unknown) {
  /**
   * React Router の action/loader は、ケースにより
   * 1) Web標準 Response
   * 2) data(...) が返す DataWithResponseInit
   * のどちらかを返す。
   *
   * 本テストは実装詳細に依存せず検証できるよう、ここで統一フォーマットへ正規化する。
   */
  if (result instanceof Response) {
    return {
      status: result.status,
      body: await result.json(),
      headers: result.headers,
    };
  }

  const asData = result as { data?: unknown; init?: ResponseInit };
  return {
    status: asData.init?.status ?? 200,
    body: asData.data,
    headers: new Headers(asData.init?.headers),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("oauth/token", () => {
  it("client 認証に失敗した場合は invalid_client(401) を返す", async () => {
    vi.mocked(validateClientCredentials).mockReturnValue(null);

    const req = makeFormRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "sample-client",
        client_secret: "wrong",
      }),
    );

    const result = await action(makeArgs(req));
    const response = await unwrapRouteResult(result);

    // OAuth2 的に「クライアント認証失敗」は 401 + invalid_client で返す。
    expect(response.status).toBe(401);
    expect((response.body as { error: string }).error).toBe("invalid_client");
  });

  it("authorization_code grant 成功時に token payload を返す", async () => {
    vi.mocked(validateClientCredentials).mockReturnValue({
      id: "sample-client",
      secret: "sample-secret",
      redirectUris: ["http://localhost:5173/oauth/callback"],
      name: "Sample OAuth Client",
    });
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(consumeAuthorizationCode).mockReturnValue({
      code: "code_abc",
      clientId: "sample-client",
      redirectUri: "http://localhost:5173/oauth/callback",
      user: {
        id: "u1",
        username: "admin",
        displayName: "Demo User",
      },
      scope: "read",
      expiresAt: Date.now() + 60_000,
    });
    vi.mocked(issueTokens).mockReturnValue({
      tokenType: "Bearer",
      accessToken: "atk_123",
      refreshToken: "rtk_123",
      expiresIn: 3600,
      scope: "read",
    });

    const req = makeFormRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "sample-client",
        client_secret: "sample-secret",
        redirect_uri: "http://localhost:5173/oauth/callback",
        code: "code_abc",
      }),
    );

    const result = await action(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect(response.status).toBe(200);
    expect((response.body as { access_token: string }).access_token).toBe("atk_123");
    expect((response.body as { refresh_token: string }).refresh_token).toBe("rtk_123");
    expect((response.body as { token_type: string }).token_type).toBe("Bearer");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("refresh_token grant 成功時に再発行トークンを返す", async () => {
    vi.mocked(validateClientCredentials).mockReturnValue({
      id: "sample-client",
      secret: "sample-secret",
      redirectUris: ["http://localhost:5173/oauth/callback"],
      name: "Sample OAuth Client",
    });
    vi.mocked(rotateAccessTokenByRefreshToken).mockReturnValue({
      tokenType: "Bearer",
      accessToken: "atk_new",
      refreshToken: "rtk_new",
      expiresIn: 3600,
      scope: "read",
    });

    const req = makeFormRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: "sample-client",
        client_secret: "sample-secret",
        refresh_token: "rtk_old",
      }),
    );

    const result = await action(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect(response.status).toBe(200);
    expect((response.body as { access_token: string }).access_token).toBe("atk_new");
    expect((response.body as { refresh_token: string }).refresh_token).toBe("rtk_new");
    expect((response.body as { scope: string }).scope).toBe("read");
  });

  it("未対応 grant_type は unsupported_grant_type を返す", async () => {
    vi.mocked(validateClientCredentials).mockReturnValue({
      id: "sample-client",
      secret: "sample-secret",
      redirectUris: ["http://localhost:5173/oauth/callback"],
      name: "Sample OAuth Client",
    });

    const req = makeFormRequest(
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "sample-client",
        client_secret: "sample-secret",
      }),
    );

    const result = await action(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect(response.status).toBe(400);
    expect((response.body as { error: string }).error).toBe("unsupported_grant_type");
  });
});
