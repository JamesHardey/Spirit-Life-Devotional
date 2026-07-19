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
