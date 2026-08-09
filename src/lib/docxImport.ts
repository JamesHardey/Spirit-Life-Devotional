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
      confession: confessionLines,
      prayerPoints,
      prayerFamilies: [],
      status: defaultStatus,
    });
  }

  return { devotionals, issues, totalBlocks: headingIdx.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk importer for pasted "Daily Recharge" WhatsApp-broadcast text — the same
// devotional as above, but pasted directly (no .docx) and with looser, more
// varied formatting. Each entry looks like:
//
//   RECHARGE
//   31ST JULY 2026                          ← ordinal DAY MONTH YEAR (no weekday)
//   GUARD YOUR HEART AGAINST...              ← TITLE
//   Scripture Reading:                       ← citation label — several variants
//   1 Timothy 6:10 (NKJV)                    ← seen in practice: "Scripture:",
//   "For the love of money is a root..."     ← "Text:", "Scripture Reading:"/(no colon),
//                                             ← inline-on-one-line, or no label at all
//   Devotional Thought                       ← optional — body is collected regardless
//   <one or more paragraphs>
//   Key Lessons                              ← optional bullet list (appended to message)
//   Confession                               ← statements — own field
//   Prayer                                   ← statements — own field
//   CHERUB OBADARE / KINDLY SHARE 🙏         ← signature/footer — discarded
//
// Unlike parseDevotionalDocx, this operates on paragraph GROUPS (splitting on
// blank lines, preserving each group's internal line breaks) rather than raw
// lines, because a label and its content are sometimes on adjacent lines with
// no blank line between them (e.g. "Confession\nMy heart belongs to God…"),
// and collapsing to single lines would either merge unrelated content or lose
// it entirely.
// ─────────────────────────────────────────────────────────────────────────────

const RECHARGE_MARKER = /^recharge$/i;
const STOP_MARKER = /^(cherub\s+obadare|kindly\s+share)/i;

const PASTE_LABELS = {
  scripture: /^(scripture(?:\s+reading)?|text)\s*:?\s*$/i,
  scriptureInline: /^(scripture(?:\s+reading)?|text)\s*:\s*(.+)$/i,
  thought: /^devotional\s*thought\s*:?$/i,
  keyLessons: /^key\s*lessons\s*:?$/i,
  further: /^further\s*study\s*:?$/i,
  confession: /^confession\s*:?$/i,
  prayer: /^prayer\s*:?$/i,
};

function toParagraphGroups(raw: string): string[][] {
  return raw
    .split(/\r?\n\s*\r?\n+/)
    .map((g) => g.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    .filter((g) => g.length > 0);
}

// Pulls the quoted verse out of a citation blob regardless of whether the
// reference comes before or after it, and whatever separator/version-tag
// surrounds it — e.g. `Ref (VER) "quote"`, `"quote" — Ref (VER)`,
// `Ref – "quote" (VER)`.
function splitCitation(combined: string): { text: string; keyVerse: string } {
  const m = combined.match(/[""]([^""]+)[""]/);
  if (!m || m.index === undefined) return { text: combined.trim(), keyVerse: combined.trim() };
  const keyVerse = m[1].trim();
  const before = combined.slice(0, m.index).trim();
  const after = combined.slice(m.index + m[0].length).trim();
  let text = [before, after].filter(Boolean).join(" ").trim();
  text = text.replace(/^[-–—:]+\s*/, "").replace(/\s*[-–—:]+\s*$/, "");
  text = text.replace(/\s+[-–—]\s+(?=\()/g, " ");
  return { text: text.replace(/\s+/g, " ").trim(), keyVerse };
}

export function parseDailyRechargeText(
  raw: string,
  defaultStatus: "published" | "draft" = "published"
): ImportResult {
  const groups = toParagraphGroups(raw);
  const hasMarkers = groups.some((g) => g.length === 1 && RECHARGE_MARKER.test(g[0]));

  // Entries start either right after a "RECHARGE" marker, or (if the paste
  // omits that marker) at each date heading directly.
  const entryStarts: number[] = [];
  groups.forEach((g, i) => {
    if (hasMarkers) {
      if (g.length === 1 && RECHARGE_MARKER.test(g[0])) entryStarts.push(i + 1);
    } else if (g.length === 1 && RECHARGE_DATE_RE.test(g[0])) {
      entryStarts.push(i);
    }
  });

  const devotionals: DevotionalInput[] = [];
  const issues: string[] = [];
  const seenDates = new Set<string>();

  for (let e = 0; e < entryStarts.length; e++) {
    const start = entryStarts[e];
    const end = e + 1 < entryStarts.length ? entryStarts[e + 1] : groups.length;
    const entryGroups = groups.slice(start, end);

    const dateIdx = entryGroups.findIndex((g) => g.length === 1 && RECHARGE_DATE_RE.test(g[0]));
    if (dateIdx === -1) {
      issues.push(`Entry ${e + 1}: no recognizable date heading, skipped`);
      continue;
    }
    const m = entryGroups[dateIdx][0].match(RECHARGE_DATE_RE)!;
    const day = parseInt(m[1], 10);
    const month = RECHARGE_MONTHS[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    const date = `${year}-${pad2(month)}-${pad2(day)}`;

    const body = entryGroups.slice(dateIdx + 1);
    let gi = 0;
    const title = (body[gi] ?? []).join(" ").trim();
    gi++;

    let text = "";
    let keyVerse = "";
    const messageLines: string[] = [];
    const keyLessonsLines: string[] = [];
    const furtherLines: string[] = [];
    const confessionLines: string[] = [];
    const prayerLines: string[] = [];
    type Section = "citation-expected" | "thought" | "keyLessons" | "further" | "confession" | "prayer";
    let section: Section = "citation-expected";

    for (; gi < body.length; gi++) {
      const g = body[gi];
      const first = g[0];

      if (STOP_MARKER.test(first)) break;

      if (section === "citation-expected") {
        let citationLines: string[];
        const inlineMatch = first.match(PASTE_LABELS.scriptureInline);
        if (inlineMatch) citationLines = [inlineMatch[2], ...g.slice(1)];
        else if (PASTE_LABELS.scripture.test(first)) citationLines = g.slice(1);
        else citationLines = g;

        const split = splitCitation(citationLines.join(" ").trim());
        text = split.text;
        keyVerse = split.keyVerse;
        section = "thought";
        continue;
      }

      const trailing = g.slice(1).join(" ").trim();
      if (PASTE_LABELS.thought.test(first)) {
        section = "thought";
        if (trailing) messageLines.push(trailing);
        continue;
      }
      if (PASTE_LABELS.keyLessons.test(first)) {
        section = "keyLessons";
        if (trailing) keyLessonsLines.push(trailing.replace(/^-+\s*/, ""));
        continue;
      }
      if (PASTE_LABELS.further.test(first)) {
        section = "further";
        if (trailing) furtherLines.push(trailing);
        continue;
      }
      if (PASTE_LABELS.confession.test(first)) {
        section = "confession";
        if (trailing) confessionLines.push(trailing);
        continue;
      }
      if (PASTE_LABELS.prayer.test(first)) {
        section = "prayer";
        if (trailing) prayerLines.push(trailing);
        continue;
      }

      const joined = g.join(" ").trim();
      if (section === "thought") messageLines.push(joined);
      else if (section === "keyLessons") keyLessonsLines.push(joined.replace(/^-+\s*/, ""));
      else if (section === "further") furtherLines.push(joined);
      else if (section === "confession") confessionLines.push(joined);
      else if (section === "prayer") prayerLines.push(joined);
    }

    let message = messageLines.join("\n\n").trim();
    if (keyLessonsLines.length) {
      message += `${message ? "\n\n" : ""}Key Lessons: ${keyLessonsLines.join(" ")}`;
    }
    if (furtherLines.length) {
      message += `${message ? "\n\n" : ""}Further Study: ${furtherLines.join(" ")}`;
    }

    if (!title) {
      issues.push(`${date} — missing title, skipped`);
      continue;
    }
    if (!message && !keyVerse) {
      issues.push(`${date} "${title}" — no body or key verse, skipped`);
      continue;
    }
    if (seenDates.has(date)) {
      issues.push(`${date} "${title}" — duplicate date in paste, kept first occurrence`);
      continue;
    }
    seenDates.add(date);

    devotionals.push({
      date,
      title,
      keyVerse,
      text,
      message,
      confession: confessionLines,
      prayerPoints: prayerLines,
      prayerFamilies: [],
      status: defaultStatus,
    });
  }

  return { devotionals, issues, totalBlocks: entryStarts.length };
}
