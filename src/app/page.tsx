import Link from "next/link";
import { getTodayDevotional } from "@/lib/db";
import { localISO } from "@/lib/date";
import { TodayDevotionalCard } from "@/components/TodayDevotionalCard";
import { StreakCard } from "@/components/StreakCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationToggle } from "@/components/NotificationToggle";

// Always render fresh so a newly-uploaded devotional shows immediately.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = localISO();
  const devotional = await getTodayDevotional(today);

  return (
    <div className="mx-auto max-w-lg pb-10">
      <section className="px-5 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-bold text-content-primary">
          Grace for today
        </h1>
        <p className="mt-1 text-sm text-content-secondary">
          Take a moment in the Word and keep your streak alive.
        </p>
      </section>

      <div className="mt-4">
        <TodayDevotionalCard devotional={devotional} />
        <StreakCard />
        <InstallPrompt />
        <NotificationToggle />

        <div className="mx-5">
          <Link
            href="/archive"
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-surface-card p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-amber-950 text-lg">
                📚
              </span>
              <span className="text-sm font-semibold text-content-primary">
                Past Devotionals
              </span>
            </div>
            <span className="text-content-muted">→</span>
          </Link>
        </div>
      </div>

      <footer className="mt-10 px-5 text-center">
        <p className="text-xs text-content-muted">
          The Spirit Life C. &amp; S. Church · Prophet Cherub Obadare
        </p>
        <Link href="/admin" className="mt-2 inline-block text-xs text-content-muted underline">
          Admin
        </Link>
      </footer>
    </div>
  );
}
