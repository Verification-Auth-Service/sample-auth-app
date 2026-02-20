import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { commitSession, getSession } from "~/services/session.server";
import { createCodeChallenge, createCodeVerifier, createState } from "~/utils/crypto.server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getEnvOrDefault(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function getRedirectUri(): string {
  const explicit = process.env.GITHUB_APP_REDIRECT_URI;
  if (explicit) return explicit;
  const origin = requireEnv("APP_ORIGIN");
  return new URL("/auth/github-app/callback", origin).toString();
}

// GET /auth/github-app
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const state = createState();
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);

  session.set("oauth:state", state); // state をセッションに保存
  session.set("oauth:verifier", verifier); // verifier をセッションに保存
  session.set("oauth:createdAt", Date.now()); // 作成日時をセッションに保存

  const authorizeUrl = new URL(getEnvOrDefault("GITHUB_APP_AUTHORIZE_URL", "https://github.com/login/oauth/authorize"));
  authorizeUrl.searchParams.set("client_id", requireEnv("GITHUB_APP_CLIENT_ID"));
  authorizeUrl.searchParams.set("redirect_uri", getRedirectUri());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  // private repository を取得したい場合は repo が必要
  const scope = process.env.GITHUB_APP_SCOPE ?? "read:user repo";
  if (scope) authorizeUrl.searchParams.set("scope", scope);

  const setCookie = await commitSession(session, { maxAge: 60 * 10 });
  return redirect(authorizeUrl.toString(), {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}
