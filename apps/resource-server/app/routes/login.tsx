import type { ActionFunctionArgs, LoaderFunctionArgs, MetaArgs } from "react-router";
import { Form, data, redirect, useActionData, useLoaderData } from "react-router";
import { authenticateWithPassword, ensureDemoUser, getLoginHint } from "~/services/auth.server";
import { commitSession, getLoggedInUser, getSession } from "~/services/session.server";

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
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
    <main>
      <h1>Login</h1>
      <p>
        最小構成のデモログイン 初期値: <code>{loaderData.hint.username}</code> / <code>password</code>
      </p>
      {actionData?.error ? <p>{actionData.error}</p> : null}
      <Form method="post">
        <input type="hidden" name="next" value={next} />
        <label>
          <span>Username</span>
          <br />
          <input name="username" defaultValue={username} autoComplete="username" />
        </label>
        <br />
        <label>
          <span>Password</span>
          <br />
          <input name="password" type="password" defaultValue="password" autoComplete="current-password" />
        </label>
        <br />
        <button type="submit">Sign in</button>
      </Form>
    </main>
  );
}
