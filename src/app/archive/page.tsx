import Link from "next/link";
import { getPublishedDevotionals } from "@/lib/db";
import { formatDateLong } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const devotionals = await getPublishedDevotionals();

  return (
    <div className="mx-auto max-w-lg pb-16">
      <div className="px-5 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-bold text-content-primary">
          Past Devotionals
        </h1>
      </div>

      <div className="mt-4 space-y-3 px-5">
        {devotionals.length === 0 && (
          <p className="text-sm text-content-muted">No devotionals published yet.</p>
        )}
        {devotionals.map((d) => (
          <Link
            key={d.date}
            href={`/devotional/${d.date}`}
            className="block rounded-2xl border border-white/5 bg-surface-card p-4 transition active:scale-[0.99]"
          >
            <p className="text-xs font-medium text-content-secondary">
              {formatDateLong(d.date)}
            </p>
            <p className="mt-1 font-serif text-base font-semibold text-content-primary">
              {d.title}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-content-muted">{d.keyVerse}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
