// Applies supabase/schema.sql and seeds the sample devotionals.
//   npm run migrate
// Reads SUPABASE_DB_URL from .env.local (the Postgres connection string).
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Minimal .env.local loader (standalone scripts don't get Next's env).
function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error("✗ SUPABASE_DB_URL is not set in .env.local");
  console.error("  Get it from Supabase → Project Settings → Database → Connection string (URI).");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

function toDevRow(d) {
  return [
    d.date,
    d.year ?? Number(String(d.date).slice(0, 4)),
    d.title,
    d.keyVerse ?? "",
    d.text ?? "",
    d.message ?? "",
    JSON.stringify(d.prayerPoints ?? []),
    JSON.stringify(d.prayerFamilies ?? []),
    d.status === "draft" ? "draft" : "published",
  ];
}

try {
  await client.connect();
  console.log("✓ Connected to Supabase Postgres");

  const schema = readFileSync(path.join(root, "supabase", "schema.sql"), "utf-8");
  await client.query(schema);
  console.log("✓ Schema applied (devotionals, push_subscriptions)");

  // Seed sample devotionals if the table is empty.
  const { rows } = await client.query("select count(*)::int as n from public.devotionals");
  if (rows[0].n === 0) {
    const seedPath = path.join(root, "data", "devotionals.json");
    if (existsSync(seedPath)) {
      const seed = JSON.parse(readFileSync(seedPath, "utf-8"));
      for (const d of seed) {
        await client.query(
          `insert into public.devotionals
             (date, year, title, key_verse, text, message, prayer_points, prayer_families, status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (date) do nothing`,
          toDevRow(d)
        );
      }
      console.log(`✓ Seeded ${seed.length} sample devotional(s)`);
    }
  } else {
    console.log(`• devotionals table already has ${rows[0].n} row(s) — skipping seed`);
  }

  console.log("\nDone. Supabase is ready.");
} catch (err) {
  console.error("✗ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
