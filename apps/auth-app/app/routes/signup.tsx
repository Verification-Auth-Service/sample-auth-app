import type { MetaArgs } from "react-router";

export function meta({}: MetaArgs) {
  return [{ title: "Sign Up" }];
}

export default function Signup() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Sign Up</h1>
      <p className="mt-2 text-sm text-slate-600">Signup page placeholder.</p>
      {/* github signup button */}
      <a href="/auth/github" className="inline-block mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
        Sign Up with GitHub
      </a>
    </main>
  );
}
