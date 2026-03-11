import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { commitSession, getSession } from "~/services/session.server";
import { prisma } from "@sample-auth-app/db";

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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getEnvOrDefault(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function getRedirectUri(origin: string): string {
  const explicit = process.env.GITHUB_APP_REDIRECT_URI;
  if (explicit) return explicit;
  return new URL("/auth/github-app/callback", origin).toString();
}

// GET /auth/github-app/callback
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // パラメータから codeとstate、error を取得
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // エラーがある場合はエラーメッセージを返す
  if (error) {
    console.error("GitHub App認証エラー:", error);
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "GitHub側で認証がキャンセルまたは拒否されました。",
      code: error,
    });
  }

  // codeとstateがない場合はエラーメッセージを返す
  if (!code || !state) {
    console.error("codeまたはstateが不足しています。", { code, state });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "必要な情報（code / state）が不足しています。",
      code: "missing_params",
    });
  }

  const session = await getSession(request);
  const savedState = session.get("oauth:state");
  if (state !== savedState) {
    console.error("stateの検証に失敗しました。", { receivedState: state, expectedState: savedState });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "セキュリティ検証に失敗しました。",
      code: "invalid_state",
    });
  }

  const verifier = session.get("oauth:verifier");
  if (!verifier || typeof verifier !== "string") {
    console.error("code_verifier がセッションに見つかりません。");
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "認証情報の検証に失敗しました。",
      code: "missing_verifier",
    });
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("GitHub App OAuth 設定が不足しています。", { clientId: !!clientId, clientSecret: !!clientSecret });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "サーバー側の設定が不足しています。",
      code: "missing_oauth_config",
    });
  }

  const tokenUrl = getEnvOrDefault("GITHUB_APP_TOKEN_URL", "https://github.com/login/oauth/access_token");
  const redirectUri = getRedirectUri(url.origin);

  const tokenRes = await fetch(tokenUrl, {
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

  console.log("GitHub Appトークンエンドポイントのレスポンス:", {
    status: tokenRes.status,
    statusText: tokenRes.statusText,
  });

  const tokenJson = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !tokenJson || tokenJson.error) {
    console.error("GitHub Appトークン交換に失敗しました。", { status: tokenRes.status, detail: tokenJson ?? null });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "トークン交換に失敗しました。しばらくしてから再度お試しください。",
      code: "token_exchange_failed",
    });
  }

  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    console.error("access_token が取得できませんでした。", { tokenJson });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "アクセストークンの取得に失敗しました。",
      code: "missing_access_token",
    });
  }

  const refreshToken = tokenJson.refresh_token as string | undefined;
  const expiresInSec = Number(tokenJson.expires_in);
  const expiresAt = Number.isFinite(expiresInSec) && expiresInSec > 0 ? new Date(Date.now() + expiresInSec * 1000) : null;
  const scope = typeof tokenJson.scope === "string" ? tokenJson.scope : null;

  // refresh_tokenがある場合はログに出力する（ただし値はマスクする）
  if (refreshToken) {
    console.log("GitHub Appリフレッシュトークンを取得しました。", { refreshTokenPreview: refreshToken.slice(0, 6) + "..." });
  } else {
    console.log("GitHub Appリフレッシュトークンは提供されませんでした。");
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userRes.ok) {
    const detail = await userRes.json().catch(() => null);
    console.error("GitHubユーザー取得に失敗しました。", { status: userRes.status, detail });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "ユーザー情報の取得に失敗しました。しばらくしてから再度お試しください。",
      code: "github_user_failed",
    });
  }

  const userJson = (await userRes.json().catch(() => null)) as { id?: number } | null;
  if (!userJson?.id) {
    console.error("GitHubユーザーIDが取得できませんでした。", { userJson });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "ユーザー情報の取得に失敗しました。しばらくしてから再度お試しください。",
      code: "missing_github_user_id",
    });
  }

  try {
    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: "github_app",
          providerAccountId: String(userJson.id),
        },
      },
      update: {
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
        scope,
      },
      create: {
        provider: "github_app",
        providerAccountId: String(userJson.id),
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
        scope,
        user: { create: {} },
      },
    });
  } catch (error) {
    console.error("OAuthアカウントの保存に失敗しました。", { error });
    return redirectToError(url, {
      title: "GitHub App認証に失敗しました",
      message: "認証情報の保存に失敗しました。しばらくしてから再度お試しください。",
      code: "db_save_failed",
    });
  }

  session.unset("oauth:state");
  session.unset("oauth:verifier");
  session.unset("oauth:createdAt");

  session.set("github:access_token", accessToken);
  if (refreshToken) session.set("github:refresh_token", refreshToken);
  session.set("github:auth_type", "github_app");
  const setCookie = await commitSession(session, { maxAge: 60 * 60 * 24 * 14 });

  console.log("GitHub Appアクセストークンを取得しました。", { accessTokenPreview: accessToken.slice(0, 6) + "..." });
  if (refreshToken) {
    console.log("GitHub Appリフレッシュトークンを取得しました。", { refreshTokenPreview: refreshToken.slice(0, 6) + "..." });
  }
  return redirect("/githubinfo", {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
