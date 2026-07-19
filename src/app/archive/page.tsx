import { getPublishedDevotionalDates } from "@/lib/db";
import { CalendarBrowser } from "@/components/CalendarBrowser";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const dates = await getPublishedDevotionalDates();

  return (
    <div className="mx-auto max-w-lg pb-16">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-serif text-2xl font-bold text-content-primary">
          Past Devotionals
        </h1>
        <p className="mt-1 text-sm text-content-secondary">
          Pick a date to read that day&apos;s devotional.
        </p>
      </div>

      {dates.length === 0 ? (
        <p className="px-5 text-sm text-content-muted">No devotionals published yet.</p>
      ) : (
        <CalendarBrowser availableDates={dates} />
      )}
    </div>
  );
}
