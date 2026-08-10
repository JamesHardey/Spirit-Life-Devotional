"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { localISO } from "@/lib/date";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Month-grid picker for browsing past devotionals by calendar date — mirrors
// the mobile app's Church Calendar screen. Only days with an uploaded,
// published devotional are clickable; the rest are shown muted.
export function CalendarBrowser({ availableDates }: { availableDates: string[] }) {
  const router = useRouter();
  const available = useMemo(() => new Set(availableDates), [availableDates]);

  const today = new Date();
  const todayISO = localISO(today);

  // Default to the month of the most recent available devotional (if today's
  // month has nothing yet), so the calendar doesn't open on an empty page.
  const initialMonth = useMemo(() => {
    if (availableDates.some((d) => d.startsWith(localISO(today).slice(0, 7)))) {
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
    const latest = availableDates[availableDates.length - 1];
    if (latest) {
      const [y, m] = latest.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [viewDate, setViewDate] = useState(initialMonth);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isoFor = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  return (
    <div className="mx-5 rounded-3xl border border-white/5 bg-surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-content-secondary transition active:scale-90"
        >
          ‹
        </button>
        <p className="font-inter-bold text-sm font-semibold text-content-primary">
          {MONTH_NAMES[month]} {year}
        </p>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-content-secondary transition active:scale-90"
        >
          ›
        </button>
      </div>

      <div className="mb-2 flex">
        {DAYS.map((d) => (
          <div key={d} className="flex-1 text-center text-xs font-medium text-content-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square w-[14.28%]" />;

          const date = isoFor(day);
          const hasContent = available.has(date);
          const isToday = date === todayISO;

          return (
            <div key={i} className="flex aspect-square w-[14.28%] items-center justify-center p-0.5">
              {hasContent ? (
                <button
                  onClick={() => router.push(`/devotional/${date}`)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition active:scale-90 ${
                    isToday
                      ? "bg-brand-amber-700 text-white"
                      : "bg-brand-amber-950 text-content-primary hover:bg-brand-amber-900"
                  }`}
                >
                  {day}
                </button>
              ) : (
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "border border-brand-amber-700 text-content-muted"
                      : "text-content-muted/50"
                  }`}
                >
                  {day}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-brand-amber-950" />
          <span className="text-xs text-content-muted">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-content-muted/40" />
          <span className="text-xs text-content-muted">Not available yet</span>
        </div>
      </div>
    </div>
  );
}
