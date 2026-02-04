import type { LoaderFunctionArgs } from "react-router";

// GET /auth/github/callback
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  return {
    ok: true,
    received: {
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      error: url.searchParams.get("error"),
    },
  };
}
