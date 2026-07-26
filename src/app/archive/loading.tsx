// Shown instantly on navigation to /archive while the available-dates list loads.
export default function ArchiveLoading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse pb-16">
      <div className="px-5 pt-6 pb-4">
        <div className="h-7 w-48 rounded-lg bg-surface-card" />
        <div className="mt-2 h-4 w-56 rounded-lg bg-surface-card" />
      </div>
      <div className="mx-5 h-96 rounded-3xl border border-white/5 bg-surface-card" />
    </div>
  );
}
