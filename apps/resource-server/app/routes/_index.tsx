import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, Link, data, useLoaderData } from "react-router";
import { getLoggedInUser } from "~/services/session.server";
import { getOAuthServerMetadata } from "~/services/oauth.server";

export function meta({}: MetaArgs) {
  return [{ title: "Resource Server" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getLoggedInUser(request);
  const oauth = getOAuthServerMetadata();
  return data({ user, oauth });
}

export default function Home() {
  const { user, oauth } = useLoaderData<typeof loader>();
  const authorizeExample = `/oauth/authorize?response_type=code&client_id=${encodeURIComponent(oauth.client.id)}&redirect_uri=${encodeURIComponent(oauth.client.redirectUris[0])}&scope=read&state=state123`;

  return (
    <main>
      <h1>Resource Server</h1>
      <p>セッションログインと OAuth2 認可コードフローを備えた最小構成です。</p>

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

      <section>
        <h2>OAuth2 (Authorization Server)</h2>
        <p>
          client_id: <code>{oauth.client.id}</code>
          <br />
          redirect_uri: <code>{oauth.client.redirectUris[0]}</code>
          <br />
          grant_types: <code>{oauth.grants.join(", ")}</code>
        </p>
        <p>
          認可エンドポイント: <a href={authorizeExample}>GET /oauth/authorize (example)</a>
          <br />
          トークンエンドポイント: <code>POST /oauth/token</code>
        </p>
      </section>
    </main>
  );
}
