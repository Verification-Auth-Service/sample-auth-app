import type { MetaArgs } from "react-router";

export function meta({}: MetaArgs) {
  return [{ title: "Sign Up" }];
}

export default function Signup() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Sign Up</h1>
      <p className="mt-2 text-sm text-slate-600">Signup page placeholder.</p>
      <div className="mt-4 flex flex-col gap-2">
        <a
          href="/auth/github"
          className="inline-block rounded bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
        >
          Sign Up with GitHub (OAuth App)
        </a>
        <a
          href="/auth/github-app"
          className="inline-block rounded bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
        >
          Sign Up with GitHub (GitHub App)
        </a>
      </div>
    </main>
  );
}
