import type { LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./api.protected";
import { verifyAccessToken } from "~/services/oauth.server";
import { getLoggedInUser } from "~/services/session.server";

vi.mock("~/services/oauth.server", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("~/services/session.server", () => ({
  getLoggedInUser: vi.fn(),
}));

function makeArgs(request: Request): LoaderFunctionArgs {
  return {
    request,
    params: {},
    context: {},
    unstable_pattern: "",
  };
}

async function unwrapRouteResult(result: unknown) {
  /**
   * loader の戻り値は Response とは限らず、data(...) の戻り値になることがある。
   * その差異を吸収して、テスト側では status/body を一貫して扱う。
   */
  if (result instanceof Response) {
    return {
      status: result.status,
      body: await result.json(),
    };
  }

  const asData = result as { data?: unknown; init?: ResponseInit };
  return {
    status: asData.init?.status ?? 200,
    body: asData.data,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("api/protected", () => {
  it("Bearer トークンが有効なら session を見ずに bearer として応答する", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      user: {
        id: "u1",
        username: "token-user",
        displayName: "Token User",
      },
      scope: "read",
      clientId: "sample-client",
      expiresAt: Date.now() + 60_000,
    });

    const req = new Request("http://localhost/api/protected", {
      headers: {
        Authorization: "Bearer atk_123",
      },
    });

    const result = await loader(makeArgs(req));
    const response = await unwrapRouteResult(result);

    // Authorization ヘッダーがある場合は Bearer 優先で評価される。
    expect((response.body as { authType: string }).authType).toBe("bearer_token");
    expect((response.body as { user: { username: string } }).user.username).toBe("token-user");
    expect(getLoggedInUser).not.toHaveBeenCalled();
  });

  it("Bearer トークンが不正なら invalid_token(401) を返す", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue(null);

    const req = new Request("http://localhost/api/protected", {
      headers: {
        Authorization: "Bearer atk_invalid",
      },
    });

    const result = await loader(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect(response.status).toBe(401);
    expect((response.body as { error: string }).error).toBe("invalid_token");
  });

  it("Bearer が無ければ session 認証へフォールバックする", async () => {
    vi.mocked(getLoggedInUser).mockResolvedValue({
      id: "u2",
      username: "session-user",
      displayName: "Session User",
    });

    const req = new Request("http://localhost/api/protected");

    const result = await loader(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect((response.body as { authType: string }).authType).toBe("session");
    expect((response.body as { user: { username: string } }).user.username).toBe("session-user");
  });

  it("Bearer も session も無効なら unauthorized(401)", async () => {
    vi.mocked(getLoggedInUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/protected");

    const result = await loader(makeArgs(req));
    const response = await unwrapRouteResult(result);

    expect(response.status).toBe(401);
    expect((response.body as { error: string }).error).toBe("unauthorized");
  });
});
