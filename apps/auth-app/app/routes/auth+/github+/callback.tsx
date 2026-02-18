import type { LoaderFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";

// GET /auth/github/callback
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // パラメータから codeとstate、error を取得
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // エラーがある場合はエラーメッセージを返す
  if (error) {
    return Response.json({ error: `GitHub認証に失敗しました: ${error}` }, { status: 400 });
  }

  // codeとstateがない場合はエラーメッセージを返す
  if (!code || !state) {
    return Response.json({ error: "GitHub認証に必要な情報が不足しています。" }, { status: 400 });
  }

  // stateを検証する（oauth:stateと比較）

  const session = await getSession(request);
  const savedState = session.get("oauth:state");
  if (state !== savedState) {
    return Response.json({ error: "不正な状態です。" }, { status: 400 });
  }
}
