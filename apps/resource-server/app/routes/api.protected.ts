import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getLoggedInUser } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getLoggedInUser(request);
  if (!user) {
    return data({ error: "unauthorized" }, { status: 401 });
  }
  return data({
    message: "protected resource",
    user,
    issuedAt: new Date().toISOString(),
  });
}
