import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import {
  consumeAuthorizationCode,
  issueTokens,
  rotateAccessTokenByRefreshToken,
  validateClientCredentials,
  validateRedirectUri,
} from "~/services/oauth.server";

function errorResponse(error: string, status = 400, description?: string) {
  return data(
    {
      error,
      error_description: description,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const grantType = String(formData.get("grant_type") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const clientSecret = String(formData.get("client_secret") ?? "").trim();

  if (!clientId || !clientSecret) {
    return errorResponse("invalid_client", 401, "client authentication failed");
  }

  const client = validateClientCredentials(clientId, clientSecret);
  if (!client) {
    return errorResponse("invalid_client", 401, "client authentication failed");
  }

  // Authorization Code Grant:
  // 認可エンドポイントで発行されたワンタイムコードを検証し、
  // クライアント認証済みの呼び出しに対してアクセストークンを払い出す。
  if (grantType === "authorization_code") {
    const code = String(formData.get("code") ?? "").trim();
    const redirectUri = String(formData.get("redirect_uri") ?? "").trim();

    if (!code || !redirectUri) {
      return errorResponse("invalid_request", 400, "code and redirect_uri are required");
    }

    if (!validateRedirectUri(client, redirectUri)) {
      return errorResponse("invalid_grant", 400, "redirect_uri is invalid");
    }

    const authorizationCode = consumeAuthorizationCode({
      code,
      clientId,
      redirectUri,
    });

    if (!authorizationCode) {
      return errorResponse("invalid_grant", 400, "authorization code is invalid or expired");
    }

    const tokenResult = issueTokens({
      clientId,
      user: authorizationCode.user,
      scope: authorizationCode.scope,
    });

    return data(
      {
        access_token: tokenResult.accessToken,
        token_type: tokenResult.tokenType,
        expires_in: tokenResult.expiresIn,
        refresh_token: tokenResult.refreshToken,
        scope: tokenResult.scope,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  }

  // Refresh Token Grant:
  // 有効なリフレッシュトークンを提示したクライアントに対し、
  // 期限切れ前提のアクセストークンを再発行する。
  if (grantType === "refresh_token") {
    const refreshToken = String(formData.get("refresh_token") ?? "").trim();
    if (!refreshToken) {
      return errorResponse("invalid_request", 400, "refresh_token is required");
    }

    const tokenResult = rotateAccessTokenByRefreshToken({
      refreshToken,
      clientId,
    });

    if (!tokenResult) {
      return errorResponse("invalid_grant", 400, "refresh token is invalid or expired");
    }

    return data(
      {
        access_token: tokenResult.accessToken,
        token_type: tokenResult.tokenType,
        expires_in: tokenResult.expiresIn,
        refresh_token: tokenResult.refreshToken,
        scope: tokenResult.scope,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  }

  return errorResponse("unsupported_grant_type", 400, "only authorization_code and refresh_token are supported");
}
