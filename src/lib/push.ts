import webpush from "web-push";
import { getSubscriptions, removeSubscription } from "./db";

// Configure web-push once from env. If VAPID keys aren't set, push is disabled
// and the app falls back to local notifications only.
let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

export function getWebPush(): typeof webpush | null {
  if (!isPushConfigured()) return null;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configured = true;
  }
  return webpush;
}

// Broadcasts one push to every subscribed device. Shared by the manual admin
// "Send notification" button and the auto-notify-on-publish paths (single
// save, bulk .docx import, WhatsApp paste import). Best-effort: failures are
// swallowed per-subscription (dead subscriptions get cleaned up) and never
// throw, so a notification hiccup never fails the publish/import itself.
export async function broadcastNotification(payload: {
  title: string;
  body: string;
  url: string;
}): Promise<{ sent: number; failed: number; total: number }> {
  if (!isPushConfigured()) return { sent: 0, failed: 0, total: 0 };

  const webpushClient = getWebPush()!;
  const json = JSON.stringify(payload);
  const subs = await getSubscriptions();
  console.log(`[push] broadcasting "${payload.title}: ${payload.body}" to ${subs.length} subscriber(s)`);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpushClient.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, json);
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint);
        }
      }
    })
  );

  return { sent, failed, total: subs.length };
}

// For a batch import (bulk .docx / WhatsApp paste), notify readers ONCE for
// the whole batch — pointing at the latest date — rather than once per entry,
// which would spam a device for a multi-day upload. Only entries that are
// newly published (weren't already published before this import) count.
export async function notifyLatestOfBatch(
  newlyPublished: { date: string; title: string }[]
): Promise<void> {
  if (newlyPublished.length === 0) return;
  const latest = newlyPublished.reduce((a, b) => (b.date > a.date ? b : a));
  await broadcastNotification({
    title: "New Devotional",
    body: latest.title,
    url: `/devotional/${latest.date}`,
  }).catch(() => {});
}
