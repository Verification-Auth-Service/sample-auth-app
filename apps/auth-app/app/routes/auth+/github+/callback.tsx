import type { LoaderFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";

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
    return Response.json({ error: `GitHub認証に失敗しました: ${error}` }, { status: 400 });
  }

  // codeとstateがない場合はエラーメッセージを返す
  if (!code || !state) {
    console.error("codeまたはstateが不足しています。", { code, state });
    return Response.json({ error: "GitHub認証に必要な情報が不足しています。" }, { status: 400 });
  }

  // stateを検証する（oauth:stateと比較）

  const session = await getSession(request);
  const savedState = session.get("oauth:state");
  if (state !== savedState) {
    console.error("stateの検証に失敗しました。", { receivedState: state, expectedState: savedState });
    return Response.json({ error: "不正な状態です。" }, { status: 400 });
  }

  const verifier = session.get("oauth:verifier");
  if (!verifier || typeof verifier !== "string") {
    console.error("code_verifier がセッションに見つかりません。");
    return Response.json({ error: "code_verifier がセッションに見つかりません。" }, { status: 400 });
  }

  //認可サーバーが認可コードを返す先のURL
  const redirectUri = `${url.origin}/auth/github/callback`;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("GitHub OAuth 設定が不足しています。", { clientId: !!clientId, clientSecret: !!clientSecret });
    return Response.json({ error: "GitHub OAuth 設定（CLIENT_ID/SECRET）が不足しています。" }, { status: 500 });
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
    return Response.json(
      {
        error: "GitHubトークン交換に失敗しました。",
        detail: tokenJson ?? null,
      },
      { status: 400 },
    );
  }

  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    console.error("access_token が取得できませんでした。", { tokenJson });
    return Response.json({ error: "access_token が取得できませんでした。", detail: tokenJson }, { status: 400 });
  }

  // とりあえず確認用に先頭六文字を返す
  console.log("GitHubアクセストークンを取得しました。", { accessTokenPreview: accessToken.slice(0, 6) + "..." });
  return Response.json({ ok: true, accessTokenPreview: accessToken.slice(0, 6) + "..." });
}
