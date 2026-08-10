"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PasteResult {
  status: string;
  dryRun?: boolean;
  parsed?: number;
  imported?: number;
  totalDays?: number;
  issues?: string[];
  preview?: { date: string; title: string; keyVerse: string }[];
  message?: string;
}

// Bulk-import devotionals pasted straight from WhatsApp/Telegram — no .docx
// conversion needed. Handles the "Daily Recharge" broadcast format, including
// its several citation-line variants.
// Flow: paste text → Preview (dry run) → Import.
export function PasteImport({ onImported }: { onImported: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [result, setResult] = useState<PasteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (dryRun: boolean) => {
    setError(null);
    if (!text.trim()) {
      setError("Paste the devotional text first.");
      return;
    }
    setBusy(dryRun ? "preview" : "import");
    setResult(null);

    try {
      const res = await fetch("/api/devotionals/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, status, dryRun }),
      });
      const data: PasteResult = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Import failed.");
      } else {
        setResult(data);
        if (!dryRun) {
          setText("");
          onImported();
          router.refresh();
        }
      }
    } catch {
      setError("Network error during import.");
    } finally {
      setBusy(null);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-surface-input px-4 py-3 text-sm text-content-primary focus:border-brand-amber-500 focus:outline-none";

  return (
    <div className="mt-6 rounded-3xl border border-white/5 bg-surface-card p-5">
      <h2 className="font-serif text-lg font-bold text-content-primary">
        Paste from WhatsApp
      </h2>
      <p className="mt-1 text-sm text-content-secondary">
        Copy one or more devotional entries straight from WhatsApp/Telegram and paste them
        below — no need to convert to a Word file first. Include the date heading (e.g.{" "}
        <code>31ST JULY 2026</code>) for each entry; a leading <code>RECHARGE</code> line
        before each one is fine but not required.
      </p>

      <div className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"RECHARGE\n\n31ST JULY 2026\n\nGUARD YOUR HEART AGAINST...\n\nScripture Reading:\n…"}
          className={inputCls}
        />

        <div>
          <label className="mb-1 block text-xs text-content-secondary">Publish as</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "published" | "draft")}
            className={inputCls}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => send(true)}
            disabled={busy !== null}
            className="rounded-xl border border-brand-amber-600 px-4 py-2.5 text-sm font-semibold text-brand-amber-300 disabled:opacity-50"
          >
            {busy === "preview" ? "Reading…" : "Preview"}
          </button>
          <button
            onClick={() => send(false)}
            disabled={busy !== null}
            className="rounded-xl bg-brand-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "import" ? "Importing…" : "Import now"}
          </button>
        </div>

        {error && <p className="text-sm text-brand-flame-400">{error}</p>}

        {result && (
          <div className="rounded-xl bg-surface-input/60 p-3 text-sm">
            {result.dryRun ? (
              <p className="font-semibold text-brand-amber-300">
                Preview: found {result.parsed} devotional(s) across {result.totalDays} date
                heading(s). Nothing saved yet.
              </p>
            ) : (
              <p className="font-semibold text-green-400">
                Imported {result.imported} devotional(s) ({result.totalDays} date heading(s) found).
              </p>
            )}

            {result.preview && result.preview.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-content-secondary">Entries:</p>
                <ul className="mt-1 space-y-1">
                  {result.preview.map((p) => (
                    <li key={p.date} className="text-xs text-content-primary/80">
                      <span className="text-content-muted">{p.date}</span> — {p.title}
                      <br />
                      <span className="text-content-muted">{p.keyVerse.slice(0, 90)}…</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.issues && result.issues.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-brand-flame-400">
                  {result.issues.length} skipped:
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                  {result.issues.map((iss, i) => (
                    <li key={i} className="text-xs text-content-muted">
                      • {iss}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
