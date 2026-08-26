import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  const s = getStore();
  const user = s.users.find((u) => u.username === body.username);
  if (!user || (body.password !== undefined && s.passwords[user.username] !== body.password)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  if (user.isSuspended) {
    return NextResponse.json({ error: "account suspended" }, { status: 403 });
  }
  user.isOnline = true;
  user.status = "online";
  user.lastSeen = new Date().toISOString();
  return NextResponse.json({ user });
}
