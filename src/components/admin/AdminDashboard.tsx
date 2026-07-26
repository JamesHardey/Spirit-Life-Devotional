"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Devotional } from "@/lib/types";
import { formatDateLong, localISO } from "@/lib/date";
import { BulkUpload } from "./BulkUpload";

const EMPTY = {
  date: localISO(),
  title: "",
  keyVerse: "",
  text: "",
  message: "",
  confession: "",
  prayerPoints: "",
  prayerFamilies: "",
  status: "published" as "published" | "draft",
};

type FormState = typeof EMPTY;

function toForm(d: Devotional): FormState {
  return {
    date: d.date,
    title: d.title,
    keyVerse: d.keyVerse,
    text: d.text,
    message: d.message,
    confession: (d.confession ?? []).join("\n"),
    prayerPoints: d.prayerPoints.join("\n"),
    prayerFamilies: (d.prayerFamilies ?? []).join("\n"),
    status: d.status,
  };
}

export function AdminDashboard({
  initialDevotionals,
  pushConfigured,
}: {
  initialDevotionals: Devotional[];
  pushConfigured: boolean;
}) {
  const router = useRouter();
  const [devotionals, setDevotionals] = useState(initialDevotionals);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY);
    setEditing(false);
  };

  const refresh = async () => {
    const res = await fetch("/api/devotionals?all=1");
    if (res.ok) {
      const data = await res.json();
      setDevotionals(data.data);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload = {
      date: form.date,
      title: form.title,
      keyVerse: form.keyVerse,
      text: form.text,
      message: form.message,
      confession: form.confession.split("\n").map((s) => s.trim()).filter(Boolean),
      prayerPoints: form.prayerPoints.split("\n").map((s) => s.trim()).filter(Boolean),
      prayerFamilies: form.prayerFamilies.split("\n").map((s) => s.trim()).filter(Boolean),
      status: form.status,
    };
    const res = await fetch("/api/devotionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ kind: "ok", text: editing ? "Devotional updated." : "Devotional published." });
      resetForm();
      await refresh();
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg({ kind: "err", text: data.message ?? "Save failed." });
    }
  };

  const edit = (d: Devotional) => {
    setForm(toForm(d));
    setEditing(true);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (date: string) => {
    if (!confirm(`Delete the devotional for ${date}?`)) return;
    setDeletingDate(date);
    const res = await fetch(`/api/devotionals/${date}`, { method: "DELETE" });
    setDeletingDate(null);
    if (res.ok) {
      await refresh();
      router.refresh();
      setMsg({ kind: "ok", text: "Devotional deleted." });
    }
  };

  const notify = async () => {
    setNotifying(true);
    setMsg(null);
    const latest = devotionals.find((d) => d.status === "published");
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Devotional",
        body: latest ? latest.title : "Today's devotional is ready.",
        url: latest ? `/devotional/${latest.date}` : "/",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setNotifying(false);
    if (res.ok) {
      setMsg({ kind: "ok", text: `Notification sent to ${data.sent}/${data.total} devices.` });
    } else {
      setMsg({ kind: "err", text: data.message ?? "Notify failed." });
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-surface-input px-4 py-3 text-sm text-content-primary placeholder:text-content-muted focus:border-brand-purple-500 focus:outline-none";

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 pb-16">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-content-primary">Admin</h1>
          <p className="text-sm text-content-secondary">Manage daily devotionals</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-content-secondary">
            View app
          </Link>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-sm text-brand-flame-400 disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-4 rounded-xl p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-green-500/10 text-green-400"
              : "bg-brand-flame-500/10 text-brand-flame-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ── Upload / edit form ── */}
      <form onSubmit={save} className="mt-6 space-y-3 rounded-3xl border border-white/5 bg-surface-card p-5">
        <h2 className="font-serif text-lg font-bold text-content-primary">
          {editing ? "Edit devotional" : "Upload devotional"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-content-secondary">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputCls}
              disabled={editing}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-content-secondary">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as "published" | "draft")}
              className={inputCls}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">Title</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Walking in the Light"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">Key Verse</label>
          <input
            value={form.keyVerse}
            onChange={(e) => set("keyVerse", e.target.value)}
            placeholder="e.g. This is the message… — 1 John 1:5"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">
            Text / Reading (optional)
          </label>
          <input
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="e.g. 1 John 1:5–10"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">
            Message (separate paragraphs with a blank line)
          </label>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            rows={8}
            placeholder="The body of the devotional…"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">
            Confession (one per line, optional — shown before Prayer Points)
          </label>
          <textarea
            value={form.confession}
            onChange={(e) => set("confession", e.target.value)}
            rows={4}
            placeholder={"I declare that…\nBy the grace of God, I…"}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">
            Prayer Points (one per line)
          </label>
          <textarea
            value={form.prayerPoints}
            onChange={(e) => set("prayerPoints", e.target.value)}
            rows={4}
            placeholder={"Father, help me to…\nLord, grant me…"}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-content-secondary">
            Pray for the following Families (one per line, optional)
          </label>
          <textarea
            value={form.prayerFamilies}
            onChange={(e) => set("prayerFamilies", e.target.value)}
            rows={3}
            placeholder={"Mr & Mrs Akinkunmi, Ibadan\nJames Adeniyi, Ibadan"}
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand-purple-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Update devotional" : "Publish devotional"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="text-sm text-content-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ── Bulk upload ── */}
      <BulkUpload onImported={refresh} />

      {/* ── Notifications ── */}
      <div className="mt-6 rounded-3xl border border-white/5 bg-surface-card p-5">
        <h2 className="font-serif text-lg font-bold text-content-primary">Notifications</h2>
        <p className="mt-1 text-sm text-content-secondary">
          Push the latest devotional to all subscribed devices.
        </p>
        {!pushConfigured && (
          <p className="mt-2 text-xs text-brand-flame-400">
            Push isn’t configured. Run <code>npm run generate-vapid</code> and add the keys to
            <code> .env.local</code>.
          </p>
        )}
        <button
          onClick={notify}
          disabled={!pushConfigured || notifying}
          className="mt-3 rounded-xl bg-brand-flame-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {notifying ? "Sending…" : "Send notification"}
        </button>
      </div>

      {/* ── Existing devotionals ── */}
      <div className="mt-6">
        <h2 className="mb-3 font-serif text-lg font-bold text-content-primary">
          All devotionals ({devotionals.length})
        </h2>
        <div className="space-y-3">
          {devotionals.length === 0 && (
            <p className="text-sm text-content-muted">Nothing uploaded yet.</p>
          )}
          {devotionals.map((d) => (
            <div
              key={d.date}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-surface-card p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-content-primary">{d.title}</p>
                  {d.status === "draft" && (
                    <span className="rounded-full bg-brand-flame-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-flame-400">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-content-muted">{formatDateLong(d.date)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => edit(d)}
                  disabled={deletingDate === d.date}
                  className="text-sm text-brand-purple-400 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(d.date)}
                  disabled={deletingDate === d.date}
                  className="text-sm text-brand-flame-400 disabled:opacity-50"
                >
                  {deletingDate === d.date ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
