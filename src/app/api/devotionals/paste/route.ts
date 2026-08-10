import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { parseDailyRechargeText } from "@/lib/docxImport";
import { getDevotionalByDate, saveDevotional } from "@/lib/db";
import { notifyLatestOfBatch } from "@/lib/push";
import type { Devotional } from "@/lib/types";

// POST /api/devotionals/paste  { text, status?, dryRun? }
// Bulk import from raw pasted text (the "Daily Recharge" WhatsApp broadcast
// format) — no .docx conversion needed. Admin only.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; status?: string; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body.text || "").trim();
  if (!raw) {
    return NextResponse.json({ status: "error", message: "Paste some devotional text first." }, { status: 400 });
  }
  const status = body.status === "draft" ? "draft" : "published";
  const dryRun = body.dryRun === true;

  let parsed;
  try {
    parsed = parseDailyRechargeText(raw, status);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Could not parse the text: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (parsed.totalBlocks === 0) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "No date headings found (expected something like \"31ST JULY 2026\"). Paste the full entry including its date line.",
      },
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

  const now = new Date().toISOString();
  let imported = 0;
  const newlyPublished: { date: string; title: string }[] = [];
  for (const d of parsed.devotionals) {
    const nextStatus = d.status === "draft" ? "draft" : "published";
    const existing = await getDevotionalByDate(d.date);
    const wasAlreadyPublished = existing?.status === "published";

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
      status: nextStatus,
      createdAt: now,
      updatedAt: now,
    };
    await saveDevotional(devotional);
    imported++;

    if (nextStatus === "published" && !wasAlreadyPublished) {
      newlyPublished.push({ date: d.date, title: d.title });
    }
  }

  await notifyLatestOfBatch(newlyPublished);

  return NextResponse.json({
    status: "success",
    imported,
    totalDays: parsed.totalBlocks,
    issues: parsed.issues,
    preview,
  });
}
