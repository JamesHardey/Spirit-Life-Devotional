import { cookies } from "next/headers";

// Minimal admin session: a signed-ish cookie holding the configured password.
// Good enough to gate a single-admin content dashboard; swap for a real auth
// provider (NextAuth, Clerk, …) if multi-user access is ever needed.

const COOKIE_NAME = "sl_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === adminPassword();
}

export const ADMIN_COOKIE = COOKIE_NAME;
