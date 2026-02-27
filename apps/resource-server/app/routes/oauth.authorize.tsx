import type { ActionFunctionArgs, LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, data, redirect, useLoaderData } from "react-router";
import { createAuthorizationCode, getOAuthClient, validateRedirectUri } from "~/services/oauth.server";
import { getLoggedInUser } from "~/services/session.server";

function normalizeParam(value: string | null) {
  return value?.trim() ?? "";
}

function buildAuthorizeQuery(url: URL) {
  return `${url.pathname}${url.search}`;
}

export function meta({}: MetaArgs) {
  return [{ title: "Authorize | Resource Server" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getLoggedInUser(request);
  const url = new URL(request.url);
  const responseType = normalizeParam(url.searchParams.get("response_type"));
  const clientId = normalizeParam(url.searchParams.get("client_id"));
  const redirectUri = normalizeParam(url.searchParams.get("redirect_uri"));
  const state = normalizeParam(url.searchParams.get("state"));
  const scope = normalizeParam(url.searchParams.get("scope")) || "read";

  if (responseType !== "code") {
    throw data({ error: "unsupported_response_type" }, { status: 400, statusText: "unsupported_response_type" });
  }

  const client = getOAuthClient(clientId);
  if (!client) {
    throw data({ error: "invalid_client" }, { status: 400, statusText: "invalid_client" });
  }

  if (!validateRedirectUri(client, redirectUri)) {
    throw data({ error: "invalid_redirect_uri" }, { status: 400, statusText: "invalid_redirect_uri" });
  }

  if (!user) {
    // 認可リクエストのクエリ（client_id / redirect_uri / state / scope）を保持したまま
    // ログイン画面へ遷移する。
    // これによりログイン成功後、同一リクエスト文脈で認可確認画面に復帰できる。
    return redirect(`/login?next=${encodeURIComponent(buildAuthorizeQuery(url))}`);
  }

  return data({
    client,
    redirectUri,
    state,
    scope,
    user,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getLoggedInUser(request);
  if (!user) {
    const url = new URL(request.url);
    // 認可画面表示後にセッションが切れたケースを考慮し、
    // POST時点で未認証なら再ログインを要求する。
    // 「表示時に認証済みだった」ことは承認操作時の保証にはならない。
    return redirect(`/login?next=${encodeURIComponent(buildAuthorizeQuery(url))}`);
  }

  const formData = await request.formData();
  const decision = String(formData.get("decision") ?? "deny");
  const clientId = String(formData.get("client_id") ?? "").trim();
  const redirectUri = String(formData.get("redirect_uri") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const scope = String(formData.get("scope") ?? "read").trim();

  const client = getOAuthClient(clientId);
  if (!client || !validateRedirectUri(client, redirectUri)) {
    return data({ error: "invalid_request" }, { status: 400 });
  }

  const callbackUrl = new URL(redirectUri);

  if (decision !== "allow") {
    // ユーザー拒否時は OAuth2 のエラーパラメータ（access_denied）で
    // クライアント側へ明示的に結果を返す。
    // state は CSRF 対策の往復値なので、受領していればそのまま返却する。
    callbackUrl.searchParams.set("error", "access_denied");
    if (state) callbackUrl.searchParams.set("state", state);
    return redirect(callbackUrl.toString());
  }

  const authorizationCode = createAuthorizationCode({
    clientId,
    redirectUri,
    user,
    scope,
  });

  callbackUrl.searchParams.set("code", authorizationCode.code);
  if (state) callbackUrl.searchParams.set("state", state);

  return redirect(callbackUrl.toString());
}

export default function OAuthAuthorize() {
  const { client, redirectUri, state, scope, user } = useLoaderData<typeof loader>();

  return (
    <main>
      <h1>OAuth Authorization</h1>
      <p>
        <strong>{client.name}</strong> があなたのアカウントで API へアクセスしようとしています。
      </p>
      <p>
        Logged in as <strong>{user.username}</strong> ({user.displayName})
      </p>
      <p>
        Scope: <code>{scope}</code>
      </p>
      <Form method="post">
        <input type="hidden" name="client_id" value={client.id} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="scope" value={scope} />
        <button type="submit" name="decision" value="allow">
          Authorize
        </button>
        {" "}
        <button type="submit" name="decision" value="deny">
          Deny
        </button>
      </Form>
    </main>
  );
}
