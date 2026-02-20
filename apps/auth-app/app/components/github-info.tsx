export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
};

type GitHubInfoViewProps = {
  repos: GitHubRepo[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(value));
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <li className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            className="block truncate text-lg font-semibold text-slate-900 transition group-hover:text-slate-700"
          >
            {repo.full_name}
          </a>
          <div className="mt-2 text-sm text-slate-600">
            {repo.description ?? "説明はありません。"}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            repo.private ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {repo.private ? "Private" : "Public"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">Stars {repo.stargazers_count}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Forks {repo.forks_count}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{repo.language ?? "Unknown"}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Updated {formatDate(repo.updated_at)}</span>
      </div>
    </li>
  );
}

export function GitHubInfoView({ repos }: GitHubInfoViewProps) {
  const publicCount = repos.filter((repo) => !repo.private).length;
  const privateCount = repos.length - publicCount;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">GitHub Overview</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">GitHub リポジトリ一覧</h1>
          <p className="mt-3 text-sm text-slate-600">
            自分のリポジトリを更新順で表示しています（最大100件）。
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full bg-slate-100 px-4 py-2">Total {repos.length}</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Public {publicCount}</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Private {privateCount}</span>
          </div>
        </header>

        {repos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
            まだリポジトリがありません。
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
