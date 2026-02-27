import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getLoggedInUser } from "~/services/session.server";
import { verifyAccessToken } from "~/services/oauth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authz = request.headers.get("Authorization");
  const bearerToken = authz?.startsWith("Bearer ") ? authz.slice("Bearer ".length).trim() : "";
  if (bearerToken) {
    // Authorization ヘッダーがある場合は OAuth Bearer を最優先で評価する。
    // これにより API クライアント（非ブラウザ/サーバー間通信）と
    // 既存ブラウザセッションの認証経路を明確に分離できる。
    const verified = verifyAccessToken(bearerToken);
    if (!verified) {
      return data({ error: "invalid_token" }, { status: 401 });
    }
    return data({
      message: "protected resource",
      authType: "bearer_token",
      user: verified.user,
      scope: verified.scope,
      clientId: verified.clientId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(verified.expiresAt).toISOString(),
    });
  }

  // Bearer がない場合のみ、既存の Cookie セッション認証へフォールバックする。
  // 段階的移行期間でも既存画面の互換性を維持するための挙動。
  const sessionUser = await getLoggedInUser(request);
  if (!sessionUser) {
    return data({ error: "unauthorized" }, { status: 401 });
  }

  return data({
    message: "protected resource",
    authType: "session",
    user: sessionUser,
    issuedAt: new Date().toISOString(),
  });
}
