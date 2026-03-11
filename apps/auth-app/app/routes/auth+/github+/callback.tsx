import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
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

// GET /auth/github/callback
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // パラメータから codeとstate、error を取得
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // エラーがある場合はエラーメッセージを返す
  if (error) {
    console.error("GitHub認証エラー:", error);
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "GitHub側で認証がキャンセルまたは拒否されました。",
      code: error,
    });
  }

  // codeとstateがない場合はエラーメッセージを返す
  if (!code || !state) {
    console.error("codeまたはstateが不足しています。", { code, state });
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "必要な情報（code / state）が不足しています。",
      code: "missing_params",
    });
  }

  // stateを検証する（oauth:stateと比較）

  const session = await getSession(request);
  const savedState = session.get("oauth:state");
  if (state !== savedState) {
    console.error("stateの検証に失敗しました。", { receivedState: state, expectedState: savedState });
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "セキュリティ検証に失敗しました。",
      code: "invalid_state",
    });
  }

  const verifier = session.get("oauth:verifier");
  if (!verifier || typeof verifier !== "string") {
    console.error("code_verifier がセッションに見つかりません。");
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "認証情報の検証に失敗しました。",
      code: "missing_verifier",
    });
  }

  //認可サーバーが認可コードを返す先のURL
  const redirectUri = `${url.origin}/auth/github/callback`;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("GitHub OAuth 設定が不足しています。", { clientId: !!clientId, clientSecret: !!clientSecret });
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "サーバー側の設定が不足しています。",
      code: "missing_oauth_config",
    });
  }

  // githubへアクセストークンをリクエストする
  // https://github.com/login/oauth/access_token

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  console.log("GitHubトークンエンドポイントのレスポンス:", {
    status: tokenRes.status,
    statusText: tokenRes.statusText,
  });

  const tokenJson = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !tokenJson || tokenJson.error) {
    console.error("GitHubトークン交換に失敗しました。", { status: tokenRes.status, detail: tokenJson ?? null });
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "トークン交換に失敗しました。しばらくしてから再度お試しください。",
      code: "token_exchange_failed",
    });
  }

  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    console.error("access_token が取得できませんでした。", { tokenJson });
    return redirectToError(url, {
      title: "GitHub認証に失敗しました",
      message: "アクセストークンの取得に失敗しました。",
      code: "missing_access_token",
    });
  }

  session.unset("oauth:state");
  session.unset("oauth:verifier");
  session.unset("oauth:createdAt");
  session.set("github:access_token", accessToken);
  session.set("github:auth_type", "oauth_app");
  const setCookie = await commitSession(session, { maxAge: 60 * 60 * 24 * 14 });

  // とりあえず確認用に先頭六文字をログに出す
  console.log("GitHubアクセストークンを取得しました。", { accessTokenPreview: accessToken.slice(0, 6) + "..." });
  return redirect("/githubinfo", {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
