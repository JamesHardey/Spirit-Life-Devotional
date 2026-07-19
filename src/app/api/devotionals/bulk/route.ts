import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { parseDevotionalDocx } from "@/lib/docxImport";
import { saveDevotional } from "@/lib/db";
import type { Devotional } from "@/lib/types";

// Bulk import runs the docx parser (mammoth) — needs the Node.js runtime.
export const runtime = "nodejs";

// POST /api/devotionals/bulk  (multipart form)
//   file    : .docx of the devotional book (required)
//   year    : e.g. 2026 (required — date headings carry no year)
//   status  : "published" | "draft" (default published)
//   dryRun  : "1" to preview without saving
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
  const year = parseInt(String(form.get("year") || ""), 10);
  const status = form.get("status") === "draft" ? "draft" : "published";
  const dryRun = form.get("dryRun") === "1";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ status: "error", message: "No file uploaded" }, { status: 400 });
  }
  const name = (file as File).name || "";
  if (!name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ status: "error", message: "Please upload a .docx file" }, { status: 400 });
  }
  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ status: "error", message: "Provide a valid year (e.g. 2026)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseDevotionalDocx(buffer, year, status);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Could not read the document: ${(err as Error).message}` },
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
    imported,
    totalDays: parsed.totalBlocks,
    issues: parsed.issues,
    preview,
  });
}
