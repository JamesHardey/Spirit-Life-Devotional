"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface BulkResult {
  status: string;
  dryRun?: boolean;
  format?: "daily-revelation" | "daily-recharge";
  parsed?: number;
  imported?: number;
  totalDays?: number;
  issues?: string[];
  preview?: { date: string; title: string; keyVerse: string }[];
  message?: string;
}

const FORMAT_LABEL: Record<string, string> = {
  "daily-revelation": "Daily Revelation",
  "daily-recharge": "Daily Recharge",
};

// Bulk-import devotionals from a .docx — format ("Daily Revelation" or
// "Daily Recharge") is auto-detected server-side.
// Flow: pick file → Preview (dry run) → Import.
export function BulkUpload({ onImported }: { onImported: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (dryRun: boolean) => {
    const file = fileRef.current?.files?.[0];
    setError(null);
    if (!file) {
      setError("Choose a .docx file first.");
      return;
    }
    setBusy(dryRun ? "preview" : "import");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("year", String(year));
    fd.append("status", status);
    if (dryRun) fd.append("dryRun", "1");

    try {
      const res = await fetch("/api/devotionals/bulk", { method: "POST", body: fd });
      const data: BulkResult = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Upload failed.");
      } else {
        setResult(data);
        if (!dryRun) {
          onImported();
          router.refresh();
        }
      }
    } catch {
      setError("Network error during upload.");
    } finally {
      setBusy(null);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-surface-input px-4 py-3 text-sm text-content-primary focus:border-brand-amber-500 focus:outline-none";

  return (
    <div className="mt-6 rounded-3xl border border-white/5 bg-surface-card p-5">
      <h2 className="font-serif text-lg font-bold text-content-primary">Bulk upload (Word)</h2>
      <p className="mt-1 text-sm text-content-secondary">
        Upload a devotional book as one <code>.docx</code>. The format is detected
        automatically — either "Daily Revelation" style (<em>MONTH DAY, Weekday</em> heading with{" "}
        <code>Text:</code> / <code>Key Verse:</code> / <code>Prayer Point:</code> labels) or
        "Daily Recharge" style (<em>ORDINAL DAY MONTH YEAR</em> heading with{" "}
        <code>SCRIPTURE READING</code> / <code>DEVOTIONAL THOUGHT</code> / <code>PRAYER</code> sections).
      </p>
      <a
        href="/templates/SpiritLife-Devotional-Bulk-Template.docx"
        className="mt-2 inline-block text-sm font-semibold text-brand-amber-400 underline"
        download
      >
        ↓ Download the Daily Revelation template
      </a>

      <div className="mt-4 space-y-3">
        <input ref={fileRef} type="file" accept=".docx" className={inputCls} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-content-secondary">
              Year <span className="text-content-muted">(Daily Revelation only)</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className={inputCls}
              min={2000}
              max={2100}
            />
          </div>
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
            {result.format && (
              <p className="mb-1 text-xs uppercase tracking-wide text-content-muted">
                Detected format: {FORMAT_LABEL[result.format] ?? result.format}
              </p>
            )}
            {result.dryRun ? (
              <p className="font-semibold text-brand-amber-300">
                Preview: found {result.parsed} devotionals across {result.totalDays} day headings.
                Nothing saved yet.
              </p>
            ) : (
              <p className="font-semibold text-green-400">
                Imported {result.imported} devotionals ({result.totalDays} day headings found).
              </p>
            )}

            {result.preview && result.preview.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-content-secondary">First entries:</p>
                <ul className="mt-1 space-y-0.5">
                  {result.preview.map((p) => (
                    <li key={p.date} className="text-xs text-content-primary/80">
                      <span className="text-content-muted">{p.date}</span> — {p.title}
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
                  {result.issues.slice(0, 30).map((iss, i) => (
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
