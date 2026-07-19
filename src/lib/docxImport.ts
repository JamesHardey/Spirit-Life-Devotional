import mammoth from "mammoth";
import type { DevotionalInput } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Bulk importer for the church's "Daily Revelation" Word format.
//
// Each day is written as:
//
//   JANUARY 1, Thursday                 ← date heading (weekday optional)
//   GET READY TO CROSS THE JORDAN       ← TITLE
//   Text: Joshua 1:1-2                  ← scripture reading
//   Key Verse: vs. 2 "Moses my servant…"← key verse
//   <one or more body paragraphs>       ← message
//   Prayer Point: I refuse to be…       ← prayer point(s) — one per line
//   Pray for the following Families: …  ← names, separated by ";"
//
// The year isn't in the heading, so the caller supplies it (the doc is dated).
// The parser is lenient: it imports every well-formed day and reports the rest
// as issues rather than failing the whole upload.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Day number followed by a separator: comma, period (a common typo in the
// source docs), or an ordinal suffix (st/nd/rd/th).
const DATE_RE = new RegExp(
  `^(${Object.keys(MONTHS).join("|")})\\s+(\\d{1,2})\\s*(?:,|\\.|st|nd|rd|th)`,
  "i"
);

const LABELS = {
  text: /^text\s*:/i,
  keyVerse: /^key\s*verse\s*:/i,
  prayer: /^prayer\s*points?\s*:/i,
  families: /^pray\s*for\s*the\s*following\s*families\s*:/i,
};

export interface ImportResult {
  devotionals: DevotionalInput[];
  issues: string[];
  totalBlocks: number;
}

function stripLabel(line: string, re: RegExp): string {
  return line.replace(re, "").trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Split a prayer block into individual points: prefer explicit line breaks;
// otherwise keep the whole prayer as a single point.
function splitPrayer(value: string): string[] {
  const byLine = value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return byLine.length > 1 ? byLine : value ? [value] : [];
}

export async function parseDevotionalDocx(
  buffer: Buffer,
  year: number,
  defaultStatus: "published" | "draft" = "published"
): Promise<ImportResult> {
  const { value: raw } = await mammoth.extractRawText({ buffer });

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " ").trim())
    .filter((l) => l.length > 0);

  // Index of every date heading.
  const headingIdx: number[] = [];
  lines.forEach((l, i) => {
    if (DATE_RE.test(l)) headingIdx.push(i);
  });

  const devotionals: DevotionalInput[] = [];
  const issues: string[] = [];
  const seenDates = new Set<string>();

  for (let h = 0; h < headingIdx.length; h++) {
    const start = headingIdx[h];
    const end = h + 1 < headingIdx.length ? headingIdx[h + 1] : lines.length;
    const heading = lines[start];
    const block = lines.slice(start + 1, end);

    const m = heading.match(DATE_RE);
    if (!m) continue;
    const month = MONTHS[m[1].toLowerCase()];
    const day = parseInt(m[2], 10);
    if (day < 1 || day > 31) {
      issues.push(`"${heading}" — invalid day, skipped`);
      continue;
    }
    const date = `${year}-${pad2(month)}-${pad2(day)}`;

    // First line after the heading is the title.
    const title = (block[0] || "").trim();

    let text = "";
    let keyVerse = "";
    const prayerPoints: string[] = [];
    const prayerFamilies: string[] = [];
    const messageLines: string[] = [];

    // Which section subsequent unlabelled lines belong to.
    let section: "message" | "prayer" | "families" = "message";
    const splitFamilies = (s: string) =>
      s.split(/;|•/).map((x) => x.trim()).filter(Boolean);

    for (let i = 1; i < block.length; i++) {
      const line = block[i];
      if (LABELS.text.test(line)) {
        text = stripLabel(line, LABELS.text);
      } else if (LABELS.keyVerse.test(line)) {
        keyVerse = stripLabel(line, LABELS.keyVerse);
      } else if (LABELS.prayer.test(line)) {
        prayerPoints.push(...splitPrayer(stripLabel(line, LABELS.prayer)));
        section = "prayer";
      } else if (LABELS.families.test(line)) {
        prayerFamilies.push(...splitFamilies(stripLabel(line, LABELS.families)));
        section = "families";
      } else if (section === "message") {
        // Body paragraph (everything between key verse and the prayer section).
        messageLines.push(line);
      } else if (section === "prayer") {
        // Continuation lines under "Prayer Point:" become extra points.
        prayerPoints.push(line.trim());
      } else {
        // Continuation lines under the families label.
        prayerFamilies.push(...splitFamilies(line));
      }
    }

    const message = messageLines.join("\n\n").trim();

    if (!title) {
      issues.push(`${date} — missing title, skipped`);
      continue;
    }
    if (!message && !keyVerse) {
      issues.push(`${date} "${title}" — no body or key verse, skipped`);
      continue;
    }
    if (seenDates.has(date)) {
      issues.push(`${date} "${title}" — duplicate date in file, skipped`);
      continue;
    }
    seenDates.add(date);

    devotionals.push({
      date,
      title,
      keyVerse,
      text,
      message,
      prayerPoints,
      prayerFamilies,
      status: defaultStatus,
    });
  }

  return { devotionals, issues, totalBlocks: headingIdx.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk importer for the "Daily Recharge" Word format (a different devotional
// book from "Daily Revelation" above — different author, different layout).
//
// Each day is written as:
//
//   24TH JUNE 2025                        ← ordinal date heading (day+month+YEAR — no weekday)
//   THE LAW OF PROCESS AND PROTOCOL       ← TITLE
//   SCRIPTURE READING                     ← label
//   Matt.3.14-15 And John tried to...     ← reference line, then optionally a quoted verse line
//   DEVOTIONAL THOUGHT                    ← label
//   <one or more body paragraphs>         ← message
//   FURTHER STUDY                         ← label (optional)
//   Mathew 3:13-17                        ← reference
//   PRAYER                                ← label (optional)
//   <prayer paragraphs>                   ← prayer point(s)
//   CONFESSION                            ← label (optional)
//   <confession statements>               ← appended as extra prayer points
//
// The year IS in the heading, so unlike parseDevotionalDocx no year argument
// is needed here — each entry carries its own exact date.
// ─────────────────────────────────────────────────────────────────────────────

const RECHARGE_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const RECHARGE_DATE_RE = new RegExp(
  `^(\\d{1,2})(?:st|nd|rd|th)\\s+(${Object.keys(RECHARGE_MONTHS).join("|")})\\s+(\\d{4})$`,
  "i"
);

const RECHARGE_LABELS = {
  scripture: /^scripture\s*reading$/i,
  thought: /^devotional\s*thought$/i,
  further: /^further\s*study$/i,
  prayer: /^prayer$/i,
  confession: /^confession$/i,
};

// Counts how strongly a raw text matches each known format, so the caller can
// pick the right parser without asking the admin to specify it.
export function detectDocxFormat(raw: string): "daily-revelation" | "daily-recharge" | "unknown" {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const revelationHits = lines.filter((l) => DATE_RE.test(l)).length;
  const rechargeHits = lines.filter((l) => RECHARGE_DATE_RE.test(l)).length;
  if (rechargeHits === 0 && revelationHits === 0) return "unknown";
  return rechargeHits > revelationHits ? "daily-recharge" : "daily-revelation";
}

export async function parseDailyRechargeDocx(
  buffer: Buffer,
  defaultStatus: "published" | "draft" = "published"
): Promise<ImportResult> {
  const { value: raw } = await mammoth.extractRawText({ buffer });

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headingIdx: number[] = [];
  lines.forEach((l, i) => {
    if (RECHARGE_DATE_RE.test(l)) headingIdx.push(i);
  });

  const devotionals: DevotionalInput[] = [];
  const issues: string[] = [];
  const seenDates = new Set<string>();

  for (let h = 0; h < headingIdx.length; h++) {
    const start = headingIdx[h];
    const end = h + 1 < headingIdx.length ? headingIdx[h + 1] : lines.length;
    const heading = lines[start];
    const block = lines.slice(start + 1, end);

    const m = heading.match(RECHARGE_DATE_RE);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = RECHARGE_MONTHS[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    if (day < 1 || day > 31) {
      issues.push(`"${heading}" — invalid day, skipped`);
      continue;
    }
    const date = `${year}-${pad2(month)}-${pad2(day)}`;

    const title = (block[0] || "").trim();

    let text = "";
    let keyVerse = "";
    const messageLines: string[] = [];
    const furtherStudyLines: string[] = [];
    const prayerPoints: string[] = [];
    const confessionLines: string[] = [];

    type Section = "none" | "scripture" | "thought" | "further" | "prayer" | "confession";
    let section: Section = "none";

    for (let i = 1; i < block.length; i++) {
      const line = block[i];
      if (RECHARGE_LABELS.scripture.test(line)) {
        section = "scripture";
      } else if (RECHARGE_LABELS.thought.test(line)) {
        section = "thought";
      } else if (RECHARGE_LABELS.further.test(line)) {
        section = "further";
      } else if (RECHARGE_LABELS.prayer.test(line)) {
        section = "prayer";
      } else if (RECHARGE_LABELS.confession.test(line)) {
        section = "confession";
      } else if (section === "scripture") {
        // First line is the reference (e.g. "Deuteronomy 6:5-6 (NKJV)"),
        // any further lines are the quoted verse text.
        if (!text) text = line;
        else keyVerse = keyVerse ? `${keyVerse} ${line}` : line;
      } else if (section === "thought") {
        messageLines.push(line);
      } else if (section === "further") {
        furtherStudyLines.push(line);
      } else if (section === "prayer") {
        prayerPoints.push(line);
      } else if (section === "confession") {
        confessionLines.push(line);
      }
      // Lines before any recognized label (section === "none") are ignored.
    }

    // A minority of entries skip the "SCRIPTURE READING" label entirely and
    // instead open the DEVOTIONAL THOUGHT paragraph with an inline
    // `Scripture: "<quote>" --- <reference>` line. Pull that out too so the
    // key verse still shows up as its own field instead of buried in the body.
    if (!text && messageLines.length > 0) {
      const inlineMatch = messageLines[0].match(
        /^scripture\s*:\s*[""]?(.+?)[""]?\s*[-–—]{1,3}\s*(.+)$/i
      );
      if (inlineMatch) {
        keyVerse = inlineMatch[1].trim();
        text = inlineMatch[2].trim();
        messageLines.shift();
      }
    }

    // Nothing under SCRIPTURE READING to use as the key verse — fall back to
    // the reference line so the reader still sees something.
    if (!keyVerse) keyVerse = text;

    let message = messageLines.join("\n\n").trim();
    if (furtherStudyLines.length) {
      message += `${message ? "\n\n" : ""}Further Study: ${furtherStudyLines.join(" ")}`;
    }

    const allPrayerPoints = [
      ...prayerPoints,
      ...confessionLines.map((l) => `(Confession) ${l}`),
    ];

    if (!title) {
      issues.push(`${date} — missing title, skipped`);
      continue;
    }
    if (!message && !keyVerse) {
      issues.push(`${date} "${title}" — no body or key verse, skipped`);
      continue;
    }
    if (seenDates.has(date)) {
      issues.push(`${date} "${title}" — duplicate date in file, kept first occurrence`);
      continue;
    }
    seenDates.add(date);

    devotionals.push({
      date,
      title,
      keyVerse,
      text,
      message,
      prayerPoints: allPrayerPoints,
      prayerFamilies: [],
      status: defaultStatus,
    });
  }

  return { devotionals, issues, totalBlocks: headingIdx.length };
}
