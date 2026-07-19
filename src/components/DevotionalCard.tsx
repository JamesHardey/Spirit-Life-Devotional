import Link from "next/link";
import type { Devotional } from "@/lib/types";
import { formatDateLong } from "@/lib/date";

// Home "today" card — mirrors the mobile DevotionalCard layout.
export function DevotionalCard({
  devotional,
  isRead,
}: {
  devotional: Devotional | null;
  isRead?: boolean;
}) {
  if (!devotional) {
    return (
      <div className="mx-5 mb-5 rounded-3xl border border-white/5 bg-surface-card p-6 text-center">
        <span className="mb-2 block text-3xl" aria-hidden>
          📭
        </span>
        <p className="text-sm font-semibold text-content-primary">Not available yet</p>
        <p className="mt-1 text-xs text-content-muted">
          Today&apos;s devotional hasn&apos;t been uploaded yet — check back soon.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/devotional/${devotional.date}?today=1`}
      className="mx-5 mb-5 block animate-fade-up rounded-3xl border border-white/5 bg-surface-card p-5 shadow-xl shadow-black/20 transition active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-purple-950">
            <span aria-hidden>📖</span>
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-content-secondary">
            Daily Devotional
          </span>
        </div>
        {isRead && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-400">
            <span aria-hidden>✓</span> Read
          </span>
        )}
      </div>

      <h2 className="mb-1 font-serif text-xl font-bold leading-7 text-content-primary">
        {devotional.title}
      </h2>
      <p className="mb-3 text-xs font-medium text-content-secondary">
        {formatDateLong(devotional.date)}
      </p>

      <div className="rounded-2xl bg-brand-purple-950/60 p-3">
        <p className="mb-1 text-xs font-semibold text-brand-purple-300">Key Verse</p>
        <p className="font-serif text-sm leading-5 text-content-primary line-clamp-3">
          {devotional.keyVerse}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <span className="text-sm font-semibold text-brand-purple-400">Read more →</span>
      </div>
    </Link>
  );
}
