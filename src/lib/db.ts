import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import type { Devotional, PushSubscriptionRecord } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Data access layer. Backed by Supabase Postgres (via the `pg` driver over the
// connection pooler) when SUPABASE_DB_URL is set; otherwise falls back to a
// local JSON-file store for `npm run dev` before Supabase is wired up.
//
// Every route/page imports only from here, so switching backends changes
// nothing else in the app.
// ─────────────────────────────────────────────────────────────────────────────

function usePostgres(): boolean {
  return Boolean(process.env.SUPABASE_DB_URL);
}

// ── Postgres pool (singleton across hot reloads) ─────────────────────────────
const globalForPg = globalThis as unknown as { _slPool?: Pool };

function pool(): Pool {
  if (!globalForPg._slPool) {
    globalForPg._slPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForPg._slPool;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToDevotional(r: any): Devotional {
  return {
    id: r.date,
    // pg returns DATE as a JS Date; normalise to YYYY-MM-DD.
    date: typeof r.date === "string" ? r.date : toISODate(r.date),
    year: r.year,
    title: r.title,
    keyVerse: r.key_verse ?? "",
    text: r.text ?? "",
    message: r.message ?? "",
    prayerPoints: r.prayer_points ?? [],
    prayerFamilies: r.prayer_families ?? [],
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── JSON fallback store ──────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const DEVOTIONALS_FILE = path.join(DATA_DIR, "devotionals.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJSON(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

// ── Devotionals ──────────────────────────────────────────────────────────────

export async function getAllDevotionals(): Promise<Devotional[]> {
  if (usePostgres()) {
    const { rows } = await pool().query(
      "select to_char(date,'YYYY-MM-DD') as date, year, title, key_verse, text, message, prayer_points, prayer_families, status, created_at, updated_at from public.devotionals order by date desc"
    );
    return rows.map(rowToDevotional);
  }
  const list = await readJSON<Devotional[]>(DEVOTIONALS_FILE, []);
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPublishedDevotionals(): Promise<Devotional[]> {
  if (usePostgres()) {
    const { rows } = await pool().query(
      "select to_char(date,'YYYY-MM-DD') as date, year, title, key_verse, text, message, prayer_points, prayer_families, status, created_at, updated_at from public.devotionals where status='published' order by date desc"
    );
    return rows.map(rowToDevotional);
  }
  return (await getAllDevotionals()).filter((d) => d.status === "published");
}

export async function getDevotionalByDate(date: string): Promise<Devotional | null> {
  if (usePostgres()) {
    const { rows } = await pool().query(
      "select to_char(date,'YYYY-MM-DD') as date, year, title, key_verse, text, message, prayer_points, prayer_families, status, created_at, updated_at from public.devotionals where date=$1",
      [date]
    );
    return rows[0] ? rowToDevotional(rows[0]) : null;
  }
  const list = await getAllDevotionals();
  return list.find((d) => d.date === date) ?? null;
}

export async function getTodayDevotional(todayISO: string): Promise<Devotional | null> {
  // Exact date match only — no falling back to an older devotional. If
  // today's entry hasn't been uploaded yet (or is still a draft), the caller
  // shows an explicit "not available yet" state instead of silently
  // substituting a stale one.
  const dev = await getDevotionalByDate(todayISO);
  return dev && dev.status === "published" ? dev : null;
}

// Just the published dates (no content) — cheap enough for calendar marking.
export async function getPublishedDevotionalDates(): Promise<string[]> {
  if (usePostgres()) {
    const { rows } = await pool().query(
      "select to_char(date,'YYYY-MM-DD') as date from public.devotionals where status='published' order by date"
    );
    return rows.map((r: { date: string }) => r.date);
  }
  return (await getPublishedDevotionals()).map((d) => d.date);
}

export async function saveDevotional(dev: Devotional): Promise<void> {
  if (usePostgres()) {
    await pool().query(
      `insert into public.devotionals
         (date, year, title, key_verse, text, message, prayer_points, prayer_families, status, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       on conflict (date) do update set
         year=excluded.year, title=excluded.title, key_verse=excluded.key_verse,
         text=excluded.text, message=excluded.message, prayer_points=excluded.prayer_points,
         prayer_families=excluded.prayer_families, status=excluded.status, updated_at=now()`,
      [
        dev.date,
        dev.year,
        dev.title,
        dev.keyVerse ?? "",
        dev.text ?? "",
        dev.message ?? "",
        JSON.stringify(dev.prayerPoints ?? []),
        JSON.stringify(dev.prayerFamilies ?? []),
        dev.status,
      ]
    );
    return;
  }
  const list = await readJSON<Devotional[]>(DEVOTIONALS_FILE, []);
  const idx = list.findIndex((d) => d.date === dev.date);
  if (idx >= 0) list[idx] = dev;
  else list.push(dev);
  await writeJSON(DEVOTIONALS_FILE, list);
}

export async function deleteDevotional(date: string): Promise<boolean> {
  if (usePostgres()) {
    const res = await pool().query("delete from public.devotionals where date=$1", [date]);
    return (res.rowCount ?? 0) > 0;
  }
  const list = await readJSON<Devotional[]>(DEVOTIONALS_FILE, []);
  const next = list.filter((d) => d.date !== date);
  if (next.length === list.length) return false;
  await writeJSON(DEVOTIONALS_FILE, next);
  return true;
}

// ── Push subscriptions ───────────────────────────────────────────────────────

export async function getSubscriptions(): Promise<PushSubscriptionRecord[]> {
  if (usePostgres()) {
    const { rows } = await pool().query(
      "select endpoint, p256dh, auth, expiration_time, created_at from public.push_subscriptions"
    );
    return rows.map((r: any) => ({
      endpoint: r.endpoint,
      expirationTime: r.expiration_time ? Number(r.expiration_time) : null,
      keys: { p256dh: r.p256dh, auth: r.auth },
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  }
  return readJSON<PushSubscriptionRecord[]>(SUBSCRIPTIONS_FILE, []);
}

export async function addSubscription(sub: PushSubscriptionRecord): Promise<void> {
  if (usePostgres()) {
    await pool().query(
      `insert into public.push_subscriptions (endpoint, p256dh, auth, expiration_time)
       values ($1,$2,$3,$4)
       on conflict (endpoint) do update set
         p256dh=excluded.p256dh, auth=excluded.auth, expiration_time=excluded.expiration_time`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth, sub.expirationTime]
    );
    return;
  }
  const list = await readJSON<PushSubscriptionRecord[]>(SUBSCRIPTIONS_FILE, []);
  if (!list.some((s) => s.endpoint === sub.endpoint)) {
    list.push(sub);
    await writeJSON(SUBSCRIPTIONS_FILE, list);
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (usePostgres()) {
    await pool().query("delete from public.push_subscriptions where endpoint=$1", [endpoint]);
    return;
  }
  const list = await readJSON<PushSubscriptionRecord[]>(SUBSCRIPTIONS_FILE, []);
  await writeJSON(
    SUBSCRIPTIONS_FILE,
    list.filter((s) => s.endpoint !== endpoint)
  );
}
