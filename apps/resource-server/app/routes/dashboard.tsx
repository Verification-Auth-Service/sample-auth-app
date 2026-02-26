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
    <main>
      <h1>Dashboard</h1>
      <p>
        ようこそ <strong>{user.displayName}</strong> さん。ここはログイン必須ページです。
      </p>
      <div>
        <Link to="/">Home</Link>
        {" | "}
        <a href="/me">GET /me</a>
        {" | "}
        <a href="/api/protected">GET /api/protected</a>
        {" "}
        <Form method="post" action="/logout">
          <button type="submit">Logout</button>
        </Form>
      </div>
    </main>
  );
}
