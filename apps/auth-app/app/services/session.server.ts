import { createCookieSessionStorage } from "react-router";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export type CreateAppSessionStorageOptions = {
  /** @deprecated Use sessionSecret instead */
  secret?: string;
  sessionSecret?: string;
  nodeEnv?: string;
};

export function createAppSessionStorage(options: CreateAppSessionStorageOptions = {}) {
  const sessionSecret = options.sessionSecret ?? options.secret ?? requireEnv("SESSION_SECRET");
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;

  return createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      sameSite: "lax",
      secure: nodeEnv === "production",
      path: "/",
      secrets: [sessionSecret],
      maxAge: 60 * 60 * 24 * 14, // 14 日
    },
  });
}

type AppSessionStorage = ReturnType<typeof createCookieSessionStorage>;
type AppSessionType = Awaited<ReturnType<AppSessionStorage["getSession"]>>;

let cachedSessionStorage: AppSessionStorage | null = null;

function getSessionStorage() {
  if (!cachedSessionStorage) {
    cachedSessionStorage = createAppSessionStorage();
  }
  return cachedSessionStorage;
}

export type AppSession = Awaited<ReturnType<typeof getSession>>;

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return getSessionStorage().getSession(cookie);
}

export async function commitSession(
  session: AppSessionType,
  options?: Parameters<AppSessionStorage["commitSession"]>[1]
) {
  return getSessionStorage().commitSession(session, options);
}

export async function destroySession(
  session: AppSessionType,
  options?: Parameters<AppSessionStorage["destroySession"]>[1]
) {
  return getSessionStorage().destroySession(session, options);
}
