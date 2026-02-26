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
    <main>
      <h1>Resource Server</h1>
      <p>セッションログイン済みユーザーだけが API にアクセスできる最小構成です。</p>

      <section>
        <h2>Session</h2>
        {user ? (
          <>
            <p>
              Logged in as <strong>{user.username}</strong> ({user.displayName})
            </p>
            <div>
              <Link to="/dashboard">Dashboard</Link>
              {" | "}
              <a href="/me">GET /me</a>
              {" | "}
              <a href="/api/protected">GET /api/protected</a>
              {" "}
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
