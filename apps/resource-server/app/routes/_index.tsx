import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, Link, data, useLoaderData } from "react-router";
import { getLoggedInUser } from "~/services/session.server";

export function meta({}: MetaArgs) {
  return [{ title: "Resource Server" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getLoggedInUser(request);
  return data({ user });
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
      <section
        style={{
          background: "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 55%, #dcfce7 100%)",
          border: "1px solid #cbd5e1",
          borderRadius: 16,
          padding: "1.25rem",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>
          Sample App
        </p>
        <h1 style={{ marginTop: 8, marginBottom: 8, fontSize: "1.8rem" }}>Original Resource Server</h1>
        <p style={{ margin: 0, color: "#334155" }}>
          セッションログイン済みユーザーだけが API にアクセスできる最小構成です。
        </p>
      </section>

      <section style={{ marginTop: "1rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Session</h2>
        {user ? (
          <>
            <p>
              Logged in as <strong>{user.username}</strong> ({user.displayName})
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/dashboard">Dashboard</Link>
              <a href="/me">GET /me</a>
              <a href="/api/protected">GET /api/protected</a>
              <Form method="post" action="/logout">
                <button type="submit">Logout</button>
              </Form>
            </div>
          </>
        ) : (
          <>
            <p>未ログインです。</p>
            <Link to="/login">Login</Link>
          </>
        )}
      </section>
    </main>
  );
}
