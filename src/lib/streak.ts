"use client";

import { localISO } from "./date";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side streak tracking (localStorage) — mirrors the mobile app, where a
// "read" is recorded per calendar day and the streak counts consecutive days.
// Kept purely on-device: no account needed.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "spiritlife-read-dates";

export function getReadDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveReadDates(dates: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
}

export function markRead(date: string): string[] {
  const dates = getReadDates();
  if (!dates.includes(date)) {
    dates.push(date);
    saveReadDates(dates);
  }
  return dates;
}

export function isRead(date: string): boolean {
  return getReadDates().includes(date);
}

export function getYearReadCount(year: number, dates = getReadDates()): number {
  return dates.filter((d) => d.startsWith(String(year))).length;
}

// Count consecutive days ending today (or yesterday if today isn't read yet).
export function getCurrentStreak(dates = getReadDates()): number {
  const set = new Set(dates);
  const cursor = new Date();
  const todayISO = localISO(cursor);

  if (!set.has(todayISO)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (set.has(localISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
