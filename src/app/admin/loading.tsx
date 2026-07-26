// Shown instantly on navigation to /admin while the auth check + devotional
// list load.
export default function AdminLoading() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl animate-pulse px-5 pb-16">
      <div className="flex items-center justify-between pt-6">
        <div>
          <div className="h-7 w-28 rounded-lg bg-surface-card" />
          <div className="mt-2 h-4 w-44 rounded-lg bg-surface-card" />
        </div>
      </div>
      <div className="mt-6 h-96 rounded-3xl border border-white/5 bg-surface-card" />
      <div className="mt-6 h-24 rounded-3xl border border-white/5 bg-surface-card" />
    </div>
  );
}
