// Shown instantly when opening a devotional (calendar tap, home card, direct
// link) while the record loads — so tapping a date never feels like nothing happened.
export default function DevotionalLoading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse pb-16">
      <article className="px-5 pt-6">
        <div className="h-3 w-28 rounded bg-surface-card" />
        <div className="mt-3 h-8 w-full rounded-lg bg-surface-card" />
        <div className="mt-2 h-8 w-2/3 rounded-lg bg-surface-card" />
        <div className="mt-3 h-4 w-40 rounded bg-surface-card" />

        <div className="mt-5 h-24 rounded-2xl bg-surface-card" />

        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-surface-card" />
          <div className="h-4 w-full rounded bg-surface-card" />
          <div className="h-4 w-5/6 rounded bg-surface-card" />
          <div className="h-4 w-full rounded bg-surface-card" />
          <div className="h-4 w-3/4 rounded bg-surface-card" />
        </div>
      </article>
    </div>
  );
}
