import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import {
  getResourceClientId,
  getResourceClientSecret,
  getResourceRedirectUri,
  getResourceTokenUrl,
} from "~/services/resource-oauth.server";
import { commitSession, getSession } from "~/services/session.server";

function redirectToError(
  url: URL,
  {
    title,
    message,
    code,
  }: {
    title: string;
    message: string;
    code?: string;
  },
) {
  const errorUrl = new URL("/error", url.origin);
  errorUrl.searchParams.set("title", title);
  errorUrl.searchParams.set("message", message);
  if (code) errorUrl.searchParams.set("code", code);
  return redirect(errorUrl.toString());
}

// GET /auth/resource/callback
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "Resource Server側で認証がキャンセルまたは拒否されました。",
      code: error,
    });
  }

  if (!code || !state) {
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "必要な情報（code / state）が不足しています。",
      code: "missing_params",
    });
  }

  const session = await getSession(request);
  const savedState = session.get("resource:oauth:state");
  if (savedState !== state) {
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "セキュリティ検証に失敗しました。",
      code: "invalid_state",
    });
  }

  let clientId: string;
  let clientSecret: string;
  try {
    clientId = getResourceClientId();
    clientSecret = getResourceClientSecret();
  } catch (e) {
    console.error("Resource OAuth設定が不足しています。", { e });
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "サーバー側の設定が不足しています。",
      code: "missing_oauth_config",
    });
  }

  const tokenRes = await fetch(getResourceTokenUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getResourceRedirectUri(url.origin),
      code,
    }),
  });

  const tokenJson = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenJson || tokenJson.error) {
    console.error("Resourceトークン交換に失敗しました。", {
      status: tokenRes.status,
      detail: tokenJson ?? null,
    });
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "トークン交換に失敗しました。しばらくしてから再度お試しください。",
      code: "token_exchange_failed",
    });
  }

  const accessToken = tokenJson.access_token as string | undefined;
  const refreshToken = tokenJson.refresh_token as string | undefined;
  const scope = tokenJson.scope as string | undefined;

  if (!accessToken) {
    return redirectToError(url, {
      title: "Resource認証に失敗しました",
      message: "アクセストークンの取得に失敗しました。",
      code: "missing_access_token",
    });
  }

  session.set("resource:access_token", accessToken);
  if (refreshToken) session.set("resource:refresh_token", refreshToken);
  if (scope) session.set("resource:scope", scope);

  const setCookie = await commitSession(session, { maxAge: 60 * 60 * 24 * 14 });

  return redirect("/resourceinfo", {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
