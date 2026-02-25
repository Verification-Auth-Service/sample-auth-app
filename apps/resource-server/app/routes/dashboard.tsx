import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, Link, data, useLoaderData } from "react-router";
import { requireUser } from "~/services/session.server";

export function meta({}: MetaArgs) {
  return [{ title: "Dashboard | Resource Server" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return data({ user });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: "#475569" }}>
        ようこそ <strong>{user.displayName}</strong> さん。ここはログイン必須ページです。
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <Link to="/">Home</Link>
        <a href="/me">GET /me</a>
        <a href="/api/protected">GET /api/protected</a>
        <Form method="post" action="/logout">
          <button type="submit">Logout</button>
        </Form>
      </div>
    </main>
  );
}
