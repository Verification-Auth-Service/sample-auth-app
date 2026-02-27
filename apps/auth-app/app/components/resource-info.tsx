type ResourceInfoViewProps = {
  authType: string;
  clientId?: string;
  scope?: string;
  payload: unknown;
};

export function ResourceInfoView({ authType, clientId, scope, payload }: ResourceInfoViewProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 px-6 py-10">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resource Server</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">保護APIレスポンス</h1>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1">authType: {authType}</span>
          {clientId ? <span className="rounded-full bg-slate-100 px-3 py-1">clientId: {clientId}</span> : null}
          {scope ? <span className="rounded-full bg-slate-100 px-3 py-1">scope: {scope}</span> : null}
        </div>

        <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          <code>{JSON.stringify(payload, null, 2)}</code>
        </pre>
      </section>
    </main>
  );
}
