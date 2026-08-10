"use client";

import { useEffect, useState } from "react";
import { getCurrentStreak, getReadDates, getYearReadCount } from "@/lib/streak";
import { getDaysInYear } from "@/lib/date";

// Streak + yearly-progress card. Reads happen client-side (localStorage), so we
// mount-guard to avoid a hydration mismatch.
export function StreakCard() {
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [read, setRead] = useState(0);

  useEffect(() => {
    const dates = getReadDates();
    setStreak(getCurrentStreak(dates));
    setRead(getYearReadCount(new Date().getFullYear(), dates));
    setMounted(true);

    // Refresh when returning to the tab (e.g. after reading on another view).
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const d = getReadDates();
        setStreak(getCurrentStreak(d));
        setRead(getYearReadCount(new Date().getFullYear(), d));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const year = new Date().getFullYear();
  const total = getDaysInYear(year);
  const percentage = mounted ? Math.round((read / total) * 100) : 0;

  return (
    <div className="mx-5 mb-6 flex items-center gap-4 rounded-3xl border border-white/5 bg-surface-card p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-flame-600/20 text-2xl">
        🔥
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-content-primary">Devotional Streak</span>
          {mounted && streak > 0 && (
            <span className="text-xs font-bold text-brand-flame-500">
              🔥 {streak} day{streak !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-input">
            <div
              className="h-full rounded-full bg-brand-amber-700 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-content-secondary">
            {mounted ? read : 0}/{total}
          </span>
        </div>
      </div>
    </div>
  );
}
