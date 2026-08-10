import { NextRequest, NextResponse } from "next/server";
import { getAllDevotionals, getDevotionalByDate, getPublishedDevotionals, saveDevotional } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { isValidISODate } from "@/lib/date";
import { broadcastNotification } from "@/lib/push";
import type { Devotional, DevotionalInput } from "@/lib/types";

// GET /api/devotionals            → published devotionals (public)
// GET /api/devotionals?all=1      → every devotional incl. drafts (admin only)
export async function GET(req: NextRequest) {
  const wantsAll = req.nextUrl.searchParams.get("all") === "1";
  if (wantsAll) {
    if (!(await isAdminAuthed())) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ status: "success", data: await getAllDevotionals() });
  }
  return NextResponse.json({ status: "success", data: await getPublishedDevotionals() });
}

// POST /api/devotionals  → create or upsert a devotional (admin only)
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  let body: DevotionalInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const errors = validate(body);
  if (errors.length) {
    return NextResponse.json({ status: "error", message: errors.join("; ") }, { status: 400 });
  }

  // Was this date already published before this save? Only a fresh
  // publish (new date, or a draft flipping to published) should notify —
  // a routine edit to already-published content shouldn't re-ping readers.
  const existing = await getDevotionalByDate(body.date);
  const wasAlreadyPublished = existing?.status === "published";

  const now = new Date().toISOString();
  const devotional: Devotional = {
    id: body.date, // date is the natural unique id (one per day)
    date: body.date,
    year: Number(body.date.slice(0, 4)),
    title: body.title.trim(),
    keyVerse: body.keyVerse.trim(),
    text: body.text.trim(),
    message: body.message.trim(),
    confession: (body.confession || []).map((p) => p.trim()).filter(Boolean),
    prayerPoints: (body.prayerPoints || []).map((p) => p.trim()).filter(Boolean),
    prayerFamilies: (body.prayerFamilies || []).map((p) => p.trim()).filter(Boolean),
    status: body.status === "draft" ? "draft" : "published",
    createdAt: now,
    updatedAt: now,
  };

  await saveDevotional(devotional);

  if (devotional.status === "published" && !wasAlreadyPublished) {
    broadcastNotification({
      title: "New Devotional",
      body: devotional.title,
      url: `/devotional/${devotional.date}`,
    }).catch(() => {});
  }

  return NextResponse.json({ status: "success", data: devotional }, { status: 201 });
}

function validate(b: DevotionalInput): string[] {
  const errors: string[] = [];
  if (!b?.date || !isValidISODate(b.date)) errors.push("Valid date (YYYY-MM-DD) is required");
  if (!b?.title?.trim()) errors.push("Title is required");
  if (!b?.keyVerse?.trim()) errors.push("Key verse is required");
  if (!b?.message?.trim()) errors.push("Message is required");
  return errors;
}
