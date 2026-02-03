import { createCookieSessionStorage } from "react-router";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const sessionSecret = requireEnv("SESSION_SECRET");

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    secrets: [sessionSecret],
    maxAge: 60 * 60 * 24 * 14, // 14 日
  },
});

export type AppSession = Awaited<ReturnType<typeof getSession>>;

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function commitSession(session: any, options?: Parameters<typeof sessionStorage.commitSession>[1]) {
  return sessionStorage.commitSession(session, options);
}

export async function destroySession(session: any, options?: Parameters<typeof sessionStorage.destroySession>[1]) {
  return sessionStorage.destroySession(session, options);
}
