import { NextRequest, NextResponse } from "next/server";
import { addSubscription, removeSubscription } from "@/lib/db";
import type { PushSubscriptionRecord } from "@/lib/types";

// POST /api/subscribe  → store a browser's push subscription
export async function POST(req: NextRequest) {
  let sub: PushSubscriptionRecord;
  try {
    sub = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ status: "error", message: "Invalid subscription" }, { status: 400 });
  }

  await addSubscription({ ...sub, createdAt: new Date().toISOString() });
  return NextResponse.json({ status: "success" });
}

// DELETE /api/subscribe  { endpoint }  → forget a subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (endpoint) await removeSubscription(endpoint);
  } catch {
    /* no-op */
  }
  return NextResponse.json({ status: "success" });
}
