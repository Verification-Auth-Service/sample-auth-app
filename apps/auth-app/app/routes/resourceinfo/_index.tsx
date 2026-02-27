import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { ResourceInfoView } from "~/components/resource-info";
import {
  getResourceClientId,
  getResourceClientSecret,
  getResourceProtectedApiUrl,
  getResourceTokenUrl,
} from "~/services/resource-oauth.server";
import { commitSession, getSession } from "~/services/session.server";

type LoaderData = {
  authType: string;
  clientId?: string;
  scope?: string;
  payload: unknown;
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

async function refreshResourceAccessToken(refreshToken: string) {
  const refreshRes = await fetch(getResourceTokenUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getResourceClientId(),
      client_secret: getResourceClientSecret(),
    }),
  });

  const refreshJson = await refreshRes.json().catch(() => null);
  if (!refreshRes.ok || !refreshJson || refreshJson.error) {
    console.error("Resourceアクセストークンの更新に失敗しました。", {
      status: refreshRes.status,
      detail: refreshJson ?? null,
    });
    return null;
  }

  const nextAccessToken = refreshJson.access_token as string | undefined;
  const nextRefreshToken = refreshJson.refresh_token as string | undefined;
  const nextScope = refreshJson.scope as string | undefined;
  if (!nextAccessToken) return null;

  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    scope: nextScope,
  };
}

// GET /resourceinfo
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const session = await getSession(request);

  const accessToken = session.get("resource:access_token");
  const refreshToken = session.get("resource:refresh_token");

  if (!accessToken || typeof accessToken !== "string") {
    return redirectToError(url, {
      title: "Resource API呼び出しに失敗しました",
      message: "アクセストークンが見つかりません。先にResource認証を実行してください。",
      code: "missing_access_token",
    });
  }

  const apiRes = await fetch(getResourceProtectedApiUrl(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!apiRes.ok) {
    if (apiRes.status === 401 && typeof refreshToken === "string" && refreshToken.length > 0) {
      const refreshed = await refreshResourceAccessToken(refreshToken);
      if (refreshed) {
        session.set("resource:access_token", refreshed.accessToken);
        if (refreshed.refreshToken) session.set("resource:refresh_token", refreshed.refreshToken);
        if (refreshed.scope) session.set("resource:scope", refreshed.scope);

        const setCookie = await commitSession(session, { maxAge: 60 * 60 * 24 * 14 });
        return redirect("/resourceinfo", {
          headers: {
            "Set-Cookie": setCookie,
          },
        });
      }
    }

    const detail = await apiRes.json().catch(() => null);
    console.error("Resource保護API取得に失敗しました。", {
      status: apiRes.status,
      detail,
    });
    return redirectToError(url, {
      title: "Resource API呼び出しに失敗しました",
      message: "保護APIの取得に失敗しました。しばらくしてから再度お試しください。",
      code: "resource_protected_failed",
    });
  }

  const payload = (await apiRes.json()) as {
    authType?: string;
    clientId?: string;
    scope?: string;
  };

  return {
    authType: payload.authType ?? "unknown",
    clientId: payload.clientId,
    scope: payload.scope,
    payload,
  } satisfies LoaderData;
}

export default function ResourceInfoIndex() {
  const data = useLoaderData() as LoaderData;
  return <ResourceInfoView authType={data.authType} clientId={data.clientId} scope={data.scope} payload={data.payload} />;
}
