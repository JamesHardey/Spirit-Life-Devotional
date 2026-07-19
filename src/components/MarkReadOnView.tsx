"use client";

import { useEffect, useState } from "react";
import { markRead, isRead } from "@/lib/streak";

// Records a "read" for this devotional's date once the reader opens it.
// Renders a small confirmation chip so the action is visible.
export function MarkReadOnView({ date }: { date: string }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    markRead(date);
    setRead(isRead(date));
  }, [date]);

  if (!read) return null;

  return (
    <div className="mx-5 mt-6 flex items-center justify-center gap-2 rounded-2xl bg-green-500/10 py-3">
      <span aria-hidden>✓</span>
      <span className="text-sm font-semibold text-green-400">
        Marked as read — streak counted
      </span>
    </div>
  );
}
