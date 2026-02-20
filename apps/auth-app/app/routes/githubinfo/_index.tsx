import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { GitHubInfoView, type GitHubRepo } from "~/components/github-info";
import { commitSession, getSession } from "~/services/session.server";

type LoaderData = {
  repos: GitHubRepo[];
};

function getEnvOrDefault(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

async function refreshGitHubAppAccessToken(refreshToken: string) {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenUrl = getEnvOrDefault("GITHUB_APP_TOKEN_URL", "https://github.com/login/oauth/access_token");
  const refreshRes = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const refreshJson = await refreshRes.json().catch(() => null);
  if (!refreshRes.ok || !refreshJson || refreshJson.error) {
    console.error("GitHub Appアクセストークンの更新に失敗しました。", { status: refreshRes.status, detail: refreshJson ?? null });
    return null;
  }

  const nextAccessToken = refreshJson.access_token as string | undefined;
  const nextRefreshToken = refreshJson.refresh_token as string | undefined;
  if (!nextAccessToken) {
    console.error("GitHub Appアクセストークンの更新レスポンスに access_token がありません。", { refreshJson });
    return null;
  }

  return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
}

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

// GET /githubinfo
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const session = await getSession(request);
  const accessToken = session.get("github:access_token");
  const authType = session.get("github:auth_type");
  const refreshToken = session.get("github:refresh_token");
  if (!accessToken || typeof accessToken !== "string") {
    return redirectToError(url, {
      title: "GitHub情報の取得に失敗しました",
      message: "アクセストークンが見つかりません。再度GitHub認証を行ってください。",
      code: "missing_access_token",
    });
  }

  const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!reposRes.ok) {
    if (
      reposRes.status === 401 &&
      authType === "github_app" &&
      typeof refreshToken === "string" &&
      refreshToken.length > 0
    ) {
      const refreshed = await refreshGitHubAppAccessToken(refreshToken);
      if (refreshed) {
        session.set("github:access_token", refreshed.accessToken);
        if (refreshed.refreshToken) {
          session.set("github:refresh_token", refreshed.refreshToken);
        }
        const setCookie = await commitSession(session, { maxAge: 60 * 60 * 24 * 14 });
        return redirect("/githubinfo", {
          headers: {
            "Set-Cookie": setCookie,
          },
        });
      }
    }

    const detail = await reposRes.json().catch(() => null);
    console.error("GitHubリポジトリ取得に失敗しました。", { status: reposRes.status, detail });
    return redirectToError(url, {
      title: "GitHub情報の取得に失敗しました",
      message: "リポジトリ一覧の取得に失敗しました。しばらくしてから再度お試しください。",
      code: "github_repos_failed",
    });
  }

  const repos = (await reposRes.json()) as GitHubRepo[];
  return { repos } satisfies LoaderData;
}

export default function GitHubInfoIndex() {
  const { repos } = useLoaderData() as LoaderData;

  return <GitHubInfoView repos={repos} />;
}
