import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { destroySession, getSession } from "~/services/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
