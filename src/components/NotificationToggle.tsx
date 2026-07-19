"use client";

import { useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  pushSupported,
} from "@/lib/pushClient";

// Row that lets the reader turn daily push reminders on/off.
export function NotificationToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setSupported(false);
      return;
    }
    getExistingSubscription().then((sub) => setEnabled(Boolean(sub)));
  }, []);

  const toggle = async () => {
    setBusy(true);
    setNote(null);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const res = await enablePush();
        if (res.ok) {
          setEnabled(true);
        } else {
          const messages: Record<string, string> = {
            unsupported: "Notifications aren't supported on this device.",
            "not-configured": "Push isn't configured on the server yet.",
            denied: "Permission was blocked. Enable it in your browser settings.",
            server: "Couldn't save your subscription. Try again.",
          };
          setNote(messages[res.reason] ?? "Couldn't enable notifications.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="mx-5 mb-6 rounded-2xl border border-white/5 bg-surface-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple-950 text-lg">
          🔔
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-content-primary">Daily Reminders</p>
          <p className="text-xs text-content-secondary">
            Get a push when a new devotional is posted.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            enabled ? "bg-brand-purple-600" : "bg-surface-input"
          } disabled:opacity-50`}
          aria-pressed={enabled}
          aria-label="Toggle daily reminders"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-brand-flame-400">{note}</p>}
    </div>
  );
}
