import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { isAdminAuthed } from "@/lib/auth";
import { detectDocxFormat, parseDailyRechargeDocx, parseDevotionalDocx } from "@/lib/docxImport";
import { saveDevotional } from "@/lib/db";
import type { Devotional } from "@/lib/types";

// Bulk import runs the docx parser (mammoth) — needs the Node.js runtime.
export const runtime = "nodejs";

// POST /api/devotionals/bulk  (multipart form)
//   file    : .docx of the devotional book (required)
//   year    : e.g. 2026 (only required for the "Daily Revelation" format,
//             whose date headings carry no year; ignored for "Daily Recharge",
//             whose headings already include the year)
//   status  : "published" | "draft" (default published)
//   dryRun  : "1" to preview without saving
//
// The format ("daily-revelation" vs "daily-recharge") is auto-detected from
// the document's own heading style so the admin doesn't have to pick one.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ status: "error", message: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  const yearRaw = parseInt(String(form.get("year") || ""), 10);
  const status = form.get("status") === "draft" ? "draft" : "published";
  const dryRun = form.get("dryRun") === "1";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ status: "error", message: "No file uploaded" }, { status: 400 });
  }
  const name = (file as File).name || "";
  if (!name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ status: "error", message: "Please upload a .docx file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let format: "daily-revelation" | "daily-recharge" | "unknown";
  try {
    const { value: raw } = await mammoth.extractRawText({ buffer });
    format = detectDocxFormat(raw);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Could not read the document: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (format === "unknown") {
    return NextResponse.json(
      { status: "error", message: "Could not recognize this document's devotional format." },
      { status: 400 }
    );
  }

  if (format === "daily-revelation" && (!yearRaw || yearRaw < 2000 || yearRaw > 2100)) {
    return NextResponse.json(
      { status: "error", message: "This format needs a valid year (e.g. 2026) — its date headings don't include one." },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed =
      format === "daily-recharge"
        ? await parseDailyRechargeDocx(buffer, status)
        : await parseDevotionalDocx(buffer, yearRaw, status);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Could not parse the document: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  const preview = parsed.devotionals.slice(0, 5).map((d) => ({
    date: d.date,
    title: d.title,
    keyVerse: d.keyVerse,
  }));

  if (dryRun) {
    return NextResponse.json({
      status: "success",
      dryRun: true,
      format,
      parsed: parsed.devotionals.length,
      totalDays: parsed.totalBlocks,
      issues: parsed.issues,
      preview,
    });
  }

  // Persist every parsed day (upsert by date).
  const now = new Date().toISOString();
  let imported = 0;
  for (const d of parsed.devotionals) {
    const devotional: Devotional = {
      id: d.date,
      date: d.date,
      year: Number(d.date.slice(0, 4)),
      title: d.title,
      keyVerse: d.keyVerse,
      text: d.text,
      message: d.message,
      confession: d.confession || [],
      prayerPoints: d.prayerPoints,
      prayerFamilies: d.prayerFamilies || [],
      status: d.status === "draft" ? "draft" : "published",
      createdAt: now,
      updatedAt: now,
    };
    await saveDevotional(devotional);
    imported++;
  }

  return NextResponse.json({
    status: "success",
    format,
    imported,
    totalDays: parsed.totalBlocks,
    issues: parsed.issues,
    preview,
  });
}
