import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function GET() {
  const s = getStore();
  return NextResponse.json({ users: s.users });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { userId?: string; action?: "suspend" | "activate" } | null;
  if (!body?.userId || !body.action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }
  const s = getStore();
  const user = s.users.find((u) => u.id === body.userId);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  user.isSuspended = body.action === "suspend";
  if (user.isSuspended) {
    user.isOnline = false;
    user.status = "offline";
  }
  return NextResponse.json({ user });
}
