import { createCookieSessionStorage, redirect } from "react-router";

type UserSession = {
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
};

function getSessionSecret() {
  return process.env.RESOURCE_SERVER_SESSION_SECRET ?? process.env.SESSION_SECRET ?? "dev-resource-server-secret";
}

const storage = createCookieSessionStorage<UserSession>({
  cookie: {
    name: "__rs_session",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    secrets: [getSessionSecret()],
    maxAge: 60 * 60 * 24,
  },
});

export async function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function commitSession(session: Awaited<ReturnType<typeof getSession>>) {
  return storage.commitSession(session);
}

export async function destroySession(session: Awaited<ReturnType<typeof getSession>>) {
  return storage.destroySession(session);
}

export async function getLoggedInUser(request: Request) {
  const session = await getSession(request);
  const user = session.get("user");
  if (!user || typeof user !== "object") return null;
  return user as NonNullable<UserSession["user"]>;
}

export async function requireUser(request: Request) {
  const user = await getLoggedInUser(request);
  if (!user) {
    const url = new URL(request.url);
    const next = `${url.pathname}${url.search}`;
    throw redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}
