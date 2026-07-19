import { notFound } from "next/navigation";
import { getDevotionalByDate } from "@/lib/db";
import { formatDateLong } from "@/lib/date";
import { MarkReadOnView } from "@/components/MarkReadOnView";

export const dynamic = "force-dynamic";

export default async function DevotionalReaderPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const devotional = await getDevotionalByDate(date);

  if (!devotional || devotional.status !== "published") notFound();

  const paragraphs = devotional.message.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="mx-auto max-w-lg pb-16">
      <article className="px-5 pt-6">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-purple-400">
          Daily Devotional
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-content-primary">
          {devotional.title}
        </h1>
        <p className="mt-2 text-sm font-medium text-content-secondary">
          {formatDateLong(devotional.date)}
        </p>

        {devotional.text && (
          <p className="mt-4 text-sm italic text-content-secondary">
            Text: {devotional.text}
          </p>
        )}

        <div className="mt-5 rounded-2xl bg-brand-purple-950/60 p-4">
          <p className="mb-1 text-xs font-semibold text-brand-purple-300">Key Verse</p>
          <p className="font-serif text-base leading-6 text-content-primary">
            {devotional.keyVerse}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-[15px] leading-7 text-content-primary/90">
              {para}
            </p>
          ))}
        </div>

        {devotional.prayerPoints.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif text-lg font-bold text-content-primary">
              Prayer Points
            </h2>
            <ul className="mt-3 space-y-2">
              {devotional.prayerPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-6 text-content-primary/90">
                  <span className="mt-0.5 text-brand-flame-500">✦</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(devotional.prayerFamilies ?? []).length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/5 bg-surface-card p-4">
            <h2 className="font-serif text-base font-bold text-content-primary">
              Pray for these families
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
              {devotional.prayerFamilies.map((fam, i) => (
                <li key={i} className="text-sm text-content-secondary">
                  {fam}
                  {i < devotional.prayerFamilies.length - 1 ? " ·" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <MarkReadOnView date={devotional.date} />
    </div>
  );
}
