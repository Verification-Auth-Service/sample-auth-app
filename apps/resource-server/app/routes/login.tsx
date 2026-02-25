import type { ActionFunctionArgs, LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, data, redirect, useActionData, useLoaderData } from "react-router";
import { authenticateWithPassword, ensureDemoUser, getLoginHint } from "~/services/auth.server";
import { commitSession, getLoggedInUser, getSession } from "~/services/session.server";

function normalizeNextPath(value: string | null) {
  return value && value.startsWith("/") ? value : "/dashboard";
}

export function meta({}: MetaArgs) {
  return [{ title: "Login | Resource Server" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureDemoUser();
  const user = await getLoggedInUser(request);
  const url = new URL(request.url);
  const next = normalizeNextPath(url.searchParams.get("next"));
  if (user) {
    return redirect(next);
  }

  return data({
    next,
    hint: getLoginHint(),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureDemoUser();
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = normalizeNextPath(String(formData.get("next") ?? "/dashboard"));

  const user = await authenticateWithPassword(username, password);
  if (!user) {
    return data(
      {
        error: "ユーザー名またはパスワードが違います。",
        values: { username },
        next,
        hint: getLoginHint(),
      },
      { status: 401 },
    );
  }

  const session = await getSession(request);
  session.set("user", user);

  return redirect(next, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function Login() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const next = actionData?.next ?? loaderData.next;
  const username = actionData?.values?.username ?? loaderData.hint.username;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}>
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          border: "1px solid #dbeafe",
          borderRadius: 20,
          padding: "1.25rem",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Login</h1>
        <p style={{ marginTop: 0, color: "#475569", fontSize: 14 }}>
          最小構成のデモログインです。初期値: <code>{loaderData.hint.username}</code> / <code>password</code>
        </p>
        {actionData?.error ? (
          <p style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.5rem" }}>
            {actionData.error}
          </p>
        ) : null}
        <Form method="post" style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="next" value={next} />
          <label style={{ display: "grid", gap: 6 }}>
            <span>Username</span>
            <input
              name="username"
              defaultValue={username}
              autoComplete="username"
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.7rem" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input
              name="password"
              type="password"
              defaultValue="password"
              autoComplete="current-password"
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "0.7rem" }}
            />
          </label>
          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 10,
              padding: "0.75rem 0.9rem",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Sign in
          </button>
        </Form>
      </section>
    </main>
  );
}
