import { Link, isRouteErrorResponse, useRouteError, useSearchParams } from "react-router";

function getParam(searchParams: URLSearchParams, key: string, fallback: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value : fallback;
}

export default function ErrorPage() {
  const [searchParams] = useSearchParams();

  const title = getParam(searchParams, "title", "エラーが発生しました");
  const message = getParam(searchParams, "message", "時間をおいて再度お試しください。");
  const code = searchParams.get("code");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-10 w-10 rounded-full bg-red-50 text-center text-red-600">
              <span className="inline-block leading-10">!</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
              {code ? (
                <p className="mt-3 text-xs text-slate-500">
                  エラーコード: <span className="font-mono">{code}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              to="/auth/github"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              GitHub認証をやり直す
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              トップへ戻る
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          問題が解決しない場合は、時間をおいて再度お試しください。
        </p>
      </div>
    </main>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = "エラーが発生しました";
  let message = "時間をおいて再度お試しください。";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "ページが見つかりませんでした" : "エラーが発生しました";
    message = error.statusText || message;
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
