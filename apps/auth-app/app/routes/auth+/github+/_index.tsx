import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { commitSession, getSession } from "~/services/session.server";
import { createCodeChallenge, createCodeVerifier, createState } from "~/utils/crypto.server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getRedirectUri(): string {
  const explicit = process.env.REDIRECT_URI;
  if (explicit) return explicit;
  const origin = requireEnv("APP_ORIGIN");
  return new URL("/auth/github/callback", origin).toString();
}

// GET /auth/github
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const state = createState();
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);

  session.set("oauth:state", state); // state をセッションに保存
  session.set("oauth:verifier", verifier); // verifier をセッションに保存
  session.set("oauth:createdAt", Date.now()); // 作成日時をセッションに保存

  const authorizeUrl = new URL(requireEnv("AUTHORIZE_URL"));
  authorizeUrl.searchParams.set("client_id", requireEnv("CLIENT_ID"));
  authorizeUrl.searchParams.set("redirect_uri", getRedirectUri());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const scope = process.env.SCOPE;
  if (scope) authorizeUrl.searchParams.set("scope", scope);

  const setCookie = await commitSession(session, { maxAge: 60 * 10 });
  return redirect(authorizeUrl.toString(), {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
