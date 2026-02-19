import type { MetaArgs } from "react-router";

export function meta({}: MetaArgs) {
  return [{ title: "Home" }];
}

export default function Index() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-2 text-sm text-slate-600">React Router file-based routes.</p>
      <a href="/signup" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">
        Go to Signup
      </a>
    </main>
  );
}
