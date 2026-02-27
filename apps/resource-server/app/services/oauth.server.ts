import { createHash, randomBytes } from "node:crypto";

export type OAuthClient = {
  id: string;
  secret: string;
  redirectUris: string[];
  name: string;
};

type AuthorizationCode = {
  code: string;
  clientId: string;
  redirectUri: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  scope: string;
  expiresAt: number;
};

type AccessTokenRecord = {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  clientId: string;
  scope: string;
  expiresAt: number;
};

type RefreshTokenRecord = {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  clientId: string;
  scope: string;
  expiresAt: number;
};

// この実装はデモ用途を優先し、認可コード・アクセストークン・リフレッシュトークンを
// すべてプロセス内メモリで管理する。
// そのため、サーバープロセスの再起動やデプロイ切替時には全トークン状態が失われる。
// 本番運用では永続ストア（DB / Redis 等）へ移行し、失効・ローテーション・監査ログを
// サーバー横断で一貫管理できる構成にすることを前提とする。
const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessTokenRecord>();
const refreshTokens = new Map<string, RefreshTokenRecord>();

const AUTHORIZATION_CODE_TTL_SEC = Number(process.env.RESOURCE_OAUTH_CODE_TTL_SEC ?? 120);
const ACCESS_TOKEN_TTL_SEC = Number(process.env.RESOURCE_OAUTH_ACCESS_TOKEN_TTL_SEC ?? 3600);
const REFRESH_TOKEN_TTL_SEC = Number(process.env.RESOURCE_OAUTH_REFRESH_TOKEN_TTL_SEC ?? 60 * 60 * 24 * 14);

function nowMs() {
  return Date.now();
}

function toScope(scope: string | null | undefined) {
  if (!scope) return "read";
  return scope
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("base64url");
}

function generateOpaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function getDefaultClient(): OAuthClient {
  const id = process.env.RESOURCE_OAUTH_CLIENT_ID ?? "sample-client";
  const secret = process.env.RESOURCE_OAUTH_CLIENT_SECRET ?? "sample-secret";
  const redirectUri = process.env.RESOURCE_OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback";
  return {
    id,
    secret,
    redirectUris: [redirectUri],
    name: process.env.RESOURCE_OAUTH_CLIENT_NAME ?? "Sample OAuth Client",
  };
}

export function getOAuthClient(clientId: string) {
  const client = getDefaultClient();
  if (client.id !== clientId) return null;
  return client;
}

export function validateClientCredentials(clientId: string, clientSecret: string) {
  const client = getOAuthClient(clientId);
  if (!client) return null;
  if (client.secret !== clientSecret) return null;
  return client;
}

export function validateRedirectUri(client: OAuthClient, redirectUri: string) {
  return client.redirectUris.includes(redirectUri);
}

export function createAuthorizationCode(params: {
  clientId: string;
  redirectUri: string;
  user: AuthorizationCode["user"];
  scope?: string | null;
}) {
  const code = generateOpaqueToken("code");
  const record: AuthorizationCode = {
    code,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    user: params.user,
    scope: toScope(params.scope),
    expiresAt: nowMs() + AUTHORIZATION_CODE_TTL_SEC * 1000,
  };
  authorizationCodes.set(hashToken(code), record);
  return record;
}

export function consumeAuthorizationCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
}) {
  const key = hashToken(params.code);
  const record = authorizationCodes.get(key);
  if (!record) return null;

  // 認可コードは再利用されるとリプレイ攻撃の窓口になるため、
  // 読み出し時点で必ず削除し「ワンタイム利用」を強制する。
  // 以降の検証で不整合が見つかっても再利用は不可とする（fail closed）。
  authorizationCodes.delete(key);

  if (record.expiresAt < nowMs()) return null;
  if (record.clientId !== params.clientId) return null;
  if (record.redirectUri !== params.redirectUri) return null;

  return record;
}

export function issueTokens(params: {
  clientId: string;
  user: AccessTokenRecord["user"];
  scope?: string | null;
}) {
  const accessToken = generateOpaqueToken("atk");
  const refreshToken = generateOpaqueToken("rtk");
  const normalizedScope = toScope(params.scope);

  const accessTokenRecord: AccessTokenRecord = {
    token: accessToken,
    user: params.user,
    clientId: params.clientId,
    scope: normalizedScope,
    expiresAt: nowMs() + ACCESS_TOKEN_TTL_SEC * 1000,
  };

  const refreshTokenRecord: RefreshTokenRecord = {
    token: refreshToken,
    user: params.user,
    clientId: params.clientId,
    scope: normalizedScope,
    expiresAt: nowMs() + REFRESH_TOKEN_TTL_SEC * 1000,
  };

  accessTokens.set(hashToken(accessToken), accessTokenRecord);
  refreshTokens.set(hashToken(refreshToken), refreshTokenRecord);

  return {
    tokenType: "Bearer" as const,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    scope: normalizedScope,
  };
}

export function rotateAccessTokenByRefreshToken(params: {
  refreshToken: string;
  clientId: string;
}) {
  const refreshRecord = refreshTokens.get(hashToken(params.refreshToken));
  if (!refreshRecord) return null;
  if (refreshRecord.expiresAt < nowMs()) {
    refreshTokens.delete(hashToken(params.refreshToken));
    return null;
  }
  if (refreshRecord.clientId !== params.clientId) return null;

  // リフレッシュ時は同一ユーザー・同一クライアント・同一スコープを引き継ぎ、
  // 新しいアクセストークン/リフレッシュトークンの組を再発行する。
  // このサンプルでは簡潔性のため旧リフレッシュトークンは即時失効しないが、
  // 本番ではトークンファミリー管理と再利用検知を実装するのが望ましい。
  return issueTokens({
    clientId: refreshRecord.clientId,
    user: refreshRecord.user,
    scope: refreshRecord.scope,
  });
}

export function verifyAccessToken(accessToken: string) {
  const record = accessTokens.get(hashToken(accessToken));
  if (!record) return null;
  if (record.expiresAt < nowMs()) {
    accessTokens.delete(hashToken(accessToken));
    return null;
  }

  return {
    user: record.user,
    scope: record.scope,
    clientId: record.clientId,
    expiresAt: record.expiresAt,
  };
}

export function getOAuthServerMetadata() {
  const client = getDefaultClient();
  return {
    client,
    grants: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethods: ["client_secret_post"],
  };
}
