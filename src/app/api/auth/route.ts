import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword } from "@/lib/auth";

// POST /api/auth  { password }  → set admin session cookie
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.password || body.password !== adminPassword()) {
    return NextResponse.json({ status: "error", message: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ status: "success" });
  res.cookies.set(ADMIN_COOKIE, adminPassword(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

// DELETE /api/auth  → log out
export async function DELETE() {
  const res = NextResponse.json({ status: "success" });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
