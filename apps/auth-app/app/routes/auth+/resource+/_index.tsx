import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { commitSession, getSession } from "~/services/session.server";
import { getResourceAuthorizeUrl, getResourceClientId, getResourceRedirectUri, getResourceScope } from "~/services/resource-oauth.server";
import { createState } from "~/utils/crypto.server";

// GET /auth/resource
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const state = createState();
  session.set("resource:oauth:state", state);
  session.set("resource:oauth:createdAt", Date.now());

  const requestUrl = new URL(request.url);
  const authorizeUrl = new URL(getResourceAuthorizeUrl());
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getResourceClientId());
  authorizeUrl.searchParams.set("redirect_uri", getResourceRedirectUri(requestUrl.origin));
  authorizeUrl.searchParams.set("scope", getResourceScope());
  authorizeUrl.searchParams.set("state", state);

  const setCookie = await commitSession(session, { maxAge: 60 * 10 });
  return redirect(authorizeUrl.toString(), {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
