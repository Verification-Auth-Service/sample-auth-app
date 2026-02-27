import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 目的:
 * - OAuth サービス層の「状態遷移」を壊さないことを担保する。
 * - 認可コードのワンタイム性、トークン検証、リフレッシュによる再発行を検証する。
 *
 * 注意:
 * - oauth.server.ts はモジュールスコープに Map を持つため、
 *   テスト間の状態汚染を避けるには毎回モジュールを再読込する必要がある。
 */
async function loadOAuthModule() {
  vi.resetModules();
  return import("./oauth.server");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("oauth.server", () => {
  it("認可コードは1回だけ交換可能（2回目は無効）", async () => {
    const oauth = await loadOAuthModule();

    const issued = oauth.createAuthorizationCode({
      clientId: "sample-client",
      redirectUri: "http://localhost:5173/oauth/callback",
      user: {
        id: "u1",
        username: "admin",
        displayName: "Demo User",
      },
      scope: "read",
    });

    const firstConsume = oauth.consumeAuthorizationCode({
      code: issued.code,
      clientId: "sample-client",
      redirectUri: "http://localhost:5173/oauth/callback",
    });

    // 1回目は正常に引き当てられること。
    expect(firstConsume).not.toBeNull();
    expect(firstConsume?.user.username).toBe("admin");

    const secondConsume = oauth.consumeAuthorizationCode({
      code: issued.code,
      clientId: "sample-client",
      redirectUri: "http://localhost:5173/oauth/callback",
    });

    // 同一コードの再利用は必ず失敗し、リプレイを許さないこと。
    expect(secondConsume).toBeNull();
  });

  it("redirect_uri が不一致なら認可コード交換を拒否する", async () => {
    const oauth = await loadOAuthModule();

    const issued = oauth.createAuthorizationCode({
      clientId: "sample-client",
      redirectUri: "http://localhost:5173/oauth/callback",
      user: {
        id: "u1",
        username: "admin",
        displayName: "Demo User",
      },
      scope: "read",
    });

    const consumed = oauth.consumeAuthorizationCode({
      code: issued.code,
      clientId: "sample-client",
      redirectUri: "http://localhost:9999/evil",
    });

    // クライアントが別 redirect_uri で交換を試みても失敗すること。
    expect(consumed).toBeNull();
  });

  it("発行したアクセストークンは verifyAccessToken で検証できる", async () => {
    const oauth = await loadOAuthModule();

    const tokenSet = oauth.issueTokens({
      clientId: "sample-client",
      user: {
        id: "u2",
        username: "alice",
        displayName: "Alice",
      },
      scope: "read write",
    });

    const verified = oauth.verifyAccessToken(tokenSet.accessToken);

    expect(verified).not.toBeNull();
    expect(verified?.clientId).toBe("sample-client");
    expect(verified?.scope).toBe("read write");
    expect(verified?.user.username).toBe("alice");
  });

  it("refresh_token により新しいトークンセットを再発行できる", async () => {
    const oauth = await loadOAuthModule();

    const first = oauth.issueTokens({
      clientId: "sample-client",
      user: {
        id: "u3",
        username: "bob",
        displayName: "Bob",
      },
      scope: "read",
    });

    const rotated = oauth.rotateAccessTokenByRefreshToken({
      refreshToken: first.refreshToken,
      clientId: "sample-client",
    });

    expect(rotated).not.toBeNull();

    // 再発行後はアクセストークン文字列が更新されることを確認する。
    expect(rotated?.accessToken).not.toBe(first.accessToken);
    expect(rotated?.refreshToken).not.toBe(first.refreshToken);

    // 新しいアクセストークンは保護API側で検証可能である必要がある。
    const verified = oauth.verifyAccessToken(rotated!.accessToken);
    expect(verified?.user.username).toBe("bob");
  });

  it("無効なクライアント資格情報は reject される", async () => {
    const oauth = await loadOAuthModule();

    const okClient = oauth.validateClientCredentials("sample-client", "sample-secret");
    const ngClient = oauth.validateClientCredentials("sample-client", "wrong-secret");

    expect(okClient).not.toBeNull();
    expect(ngClient).toBeNull();
  });
});
