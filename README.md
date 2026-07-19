# SpiritLife Daily Devotional (Next.js PWA)

An installable Progressive Web App for **The Spirit Life C. & S. Church** — a focused,
devotional-only companion to the SpiritLife mobile app. Readers get today's
devotional, keep a reading **streak**, and receive **push notifications**; an
**admin dashboard** lets the church upload each day's devotional.

Shares the SpiritLife visual identity: purple + flame palette, **Inter** (body)
and **Playfair Display** (headings).

## Features

- 📖 **Today's devotional** on the home screen, with key verse, message, and prayer points
- 🔥 **Streak tracking** — reads are recorded per day on-device (localStorage), no account needed
- 📚 **Archive** of past devotionals
- 🛠️ **Admin dashboard** (`/admin`) to create, edit, delete, and publish/draft devotionals
- 📄 **Bulk upload from Word** — upload a whole year as one `.docx` (the church's "Daily Revelation" format); a downloadable template + dry-run preview are built in
- 🔔 **Web Push notifications** — admin can broadcast the latest devotional to all subscribers
- 📲 **Installable PWA** — manifest, service worker, offline app-shell caching, iOS/Android install prompts

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3** (brand palette mirrors `SpiritLife/tailwind.config.js`)
- **Backend**: Next.js Route Handlers (`src/app/api/*`). Data layer `src/lib/db.ts` is **dual-mode**: uses **Supabase Postgres** (via `pg` over the connection pooler) when `SUPABASE_DB_URL` is set, else falls back to a local JSON store (`data/*.json`)
- **Notifications**: **Web Push (VAPID)** via `web-push`; subscriptions stored in Supabase (`push_subscriptions`); sent manually from the admin "Send notification" button
- Service worker at `public/sw.js`

## Database (Supabase)

Tables live in `supabase/schema.sql` (`devotionals`, `push_subscriptions`). Apply them with:

```bash
npm run migrate   # reads SUPABASE_DB_URL, creates tables, seeds sample devotionals
```

Set in `.env.local`:

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_DB_URL=postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> Use the **pooler** connection string (Settings → Database → Connection string → Session/Transaction
> pooler), **not** the direct `db.<ref>.supabase.co` host — that host is IPv6-only and unreachable
> from IPv4 networks. For serverless (Vercel), use the **Transaction pooler** (port `6543`).
> Access is via a direct Postgres connection, so RLS is enabled with no public policies and the
> browser-facing publishable key is never used server-side.

## Getting started

```bash
npm install

# 1. Configure environment
cp .env.example .env.local
#    - set ADMIN_PASSWORD
#    - generate VAPID keys for push (optional but needed for notifications):
npm run generate-vapid
#    paste the printed keys into .env.local

# 2. (Re)generate PWA icons if you change the mark
node scripts/generate-icons.mjs

# 3. Run
npm run dev        # http://localhost:3000
```

> Push notifications require **HTTPS** (localhost is treated as secure). When
> deploying, serve over HTTPS so the service worker and Push API work.

## Project layout

```
src/
  app/
    page.tsx                     Home — today's devotional + streak + install/notify
    devotional/[date]/page.tsx   Reader (marks the day read)
    archive/page.tsx             Past devotionals
    admin/page.tsx               Auth-gated admin dashboard
    manifest.ts                  PWA web manifest
    api/
      devotionals/route.ts       GET list · POST upsert (admin)
      devotionals/[date]/route.ts GET one · DELETE (admin)
      devotionals/bulk/route.ts  POST .docx bulk import + dry-run (admin)
      auth/route.ts              admin login/logout (cookie session)
      subscribe/route.ts         store/remove push subscription
      notify/route.ts            broadcast push (admin)
  components/                     UI (cards, header, toggles, admin)
  lib/                            types, db, date, streak, auth, push
public/
  sw.js                          service worker (offline + push)
  icons/                         generated PWA icons
data/                            JSON store (devotionals, subscriptions)
scripts/                         VAPID + icon generators
```

## Admin

Visit `/admin`, sign in with `ADMIN_PASSWORD`. From there you can:

- Upload a devotional (date, title, key verse, reading, message, prayer points)
- Save as **Published** (visible to readers) or **Draft**
- Edit or delete existing devotionals
- **Send notification** to push the latest devotional to all subscribed devices

### Bulk upload (Word)

The church writes a full year in one `.docx`. On the admin page, **Bulk upload (Word)** →
choose the file and the **year** (headings carry no year) → **Preview** (dry run, saves
nothing) → **Import now**. Re-uploading updates any days that already exist for that year.

Each day must follow this structure (labels are read literally — don't rename them):

```
JANUARY 1, Thursday                     ← MONTH DAY, Weekday  (weekday optional)
GET READY TO CROSS THE JORDAN           ← TITLE
Text: Joshua 1:1-2                       ← scripture reading
Key Verse: vs. 2 "Moses my servant…"     ← key verse
<one or more body paragraphs>            ← message
Prayer Point: I refuse to be complacent… ← prayer (extra lines = extra points)
Pray for the following Families: A; B; C  ← names separated by ";"
```

A ready-to-fill template downloads from the admin page, or regenerate it with
`npm run generate-template` (→ `public/templates/SpiritLife-Devotional-Bulk-Template.docx`).
The parser lives in `src/lib/docxImport.ts` (uses `mammoth`).

## Notes

- The JSON data store is process-local. On serverless hosts with ephemeral
  filesystems (e.g. Vercel), move `src/lib/db.ts` to a hosted database.
- Streaks are intentionally device-local, matching the mobile app's behavior.
- Replace `public/icons/*` and the header mark with the official SpiritLife logo
  for production branding.
