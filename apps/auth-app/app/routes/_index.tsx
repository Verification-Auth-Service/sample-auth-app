import type { MetaArgs } from "react-router";

export function meta({}: MetaArgs) {
  return [{ title: "Home" }];
}

export default function Index() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-2 text-sm text-slate-600">React Router file-based routes.</p>
    </main>
  );
}
