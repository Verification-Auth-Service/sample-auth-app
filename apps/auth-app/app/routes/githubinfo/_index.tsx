import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { GitHubInfoView, type GitHubRepo } from "~/components/github-info";
import { getSession } from "~/services/session.server";

type LoaderData = {
  repos: GitHubRepo[];
};

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
