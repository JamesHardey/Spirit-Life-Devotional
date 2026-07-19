"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// Persistent app-bar. Lives outside the scroll area (see layout.tsx), so it
// stays fixed at the top while the content below scrolls — the native-app feel.
// Hidden on /admin, which has its own chrome.
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/admin")) return null;

  const isHome = pathname === "/";
  const subtitle = pathname.startsWith("/archive")
    ? "Archive"
    : pathname.startsWith("/devotional")
      ? "Devotional"
      : "Daily Devotional";

  return (
    <header className="app-header">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        {!isHome && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-content-secondary transition active:scale-90 active:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple-700 to-brand-purple-900 shadow-lg shadow-brand-purple-950/50">
            <span className="text-lg" aria-hidden>
              🔥
            </span>
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-bold text-content-primary">
              SpiritLife
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.15em] text-content-muted">
              {subtitle}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
