import { NextRequest, NextResponse } from "next/server";
import { deleteDevotional, getDevotionalByDate } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

// GET /api/devotionals/:date  → single devotional (public if published)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const dev = await getDevotionalByDate(date);
  if (!dev) {
    return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });
  }
  if (dev.status !== "published" && !(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "success", data: dev });
}

// DELETE /api/devotionals/:date  → remove a devotional (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }
  const { date } = await params;
  const ok = await deleteDevotional(date);
  if (!ok) {
    return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "success" });
}
