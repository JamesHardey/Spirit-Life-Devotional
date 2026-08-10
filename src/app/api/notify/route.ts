import { NextRequest, NextResponse } from "next/server";
import { broadcastNotification, isPushConfigured } from "@/lib/push";
import { isAdminAuthed } from "@/lib/auth";

// POST /api/notify  { title, body, url }  → broadcast a push to all subscribers (admin only)
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { status: "error", message: "Push is not configured. Run `npm run generate-vapid` and set the VAPID keys." },
      { status: 400 }
    );
  }

  let body: { title?: string; body?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const result = await broadcastNotification({
    title: body.title || "SpiritLife Devotional",
    body: body.body || "Today's devotional is ready.",
    url: body.url || "/",
  });

  return NextResponse.json({ status: "success", ...result });
}
