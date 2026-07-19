// Devotional model — mirrors the SpiritLife mobile app's Devotional type,
// trimmed to what a devotional-only app needs.
export interface Devotional {
  id: string;
  date: string; // YYYY-MM-DD (unique key — one devotional per day)
  year: number;
  title: string;
  keyVerse: string; // e.g. "For God so loved the world — John 3:16"
  text: string; // the scripture reading reference / passage
  message: string; // the main devotional body (plain text, paragraphs split on \n\n)
  prayerPoints: string[];
  prayerFamilies: string[]; // "Pray for the following Families" — names/birthdays
  status: "published" | "draft";
  createdAt: string;
  updatedAt: string;
}

// Payload accepted by the admin create/update endpoints.
export interface DevotionalInput {
  date: string;
  title: string;
  keyVerse: string;
  text: string;
  message: string;
  prayerPoints: string[];
  prayerFamilies?: string[];
  status?: "published" | "draft";
}

// Stored Web Push subscription (shape produced by PushManager.subscribe()).
export interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}
