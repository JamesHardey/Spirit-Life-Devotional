import { NextRequest, NextResponse } from "next/server";
import { getSubscriptions, removeSubscription } from "@/lib/db";
import { getWebPush, isPushConfigured } from "@/lib/push";
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

  const webpush = getWebPush()!;
  const payload = JSON.stringify({
    title: body.title || "SpiritLife Devotional",
    body: body.body || "Today's devotional is ready.",
    url: body.url || "/",
  });

  const subs = await getSubscriptions();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // 404/410 mean the subscription is dead — clean it up.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ status: "success", sent, failed, total: subs.length });
}
