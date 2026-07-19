-- SpiritLife Devotional — Supabase schema
-- Run via `npm run migrate` (uses SUPABASE_DB_URL) or paste into the SQL Editor.

-- ── Devotionals ──────────────────────────────────────────────────────────────
create table if not exists public.devotionals (
  date            date primary key,                 -- one devotional per day (natural key)
  year            int  not null,
  title           text not null,
  key_verse       text not null default '',
  text            text not null default '',
  message         text not null default '',
  prayer_points   jsonb not null default '[]'::jsonb,
  prayer_families jsonb not null default '[]'::jsonb,
  status          text not null default 'published'
                    check (status in ('published', 'draft')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists devotionals_status_date_idx
  on public.devotionals (status, date desc);

-- ── Push subscriptions ───────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  endpoint        text primary key,
  p256dh          text not null,
  auth            text not null,
  expiration_time bigint,
  created_at      timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- All access goes through the Next.js server using the service_role key, which
-- bypasses RLS. We enable RLS with no public policies so the anon key can't
-- read/write these tables directly from a browser.
alter table public.devotionals        enable row level security;
alter table public.push_subscriptions enable row level security;
