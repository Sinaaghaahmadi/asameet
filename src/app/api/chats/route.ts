import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { Chat } from "@/lib/types";

export async function GET(req: NextRequest) {
  const s = getStore();
  const userId = req.nextUrl.searchParams.get("userId");
  const chats = userId ? s.chats.filter((c) => c.memberIds.includes(userId)) : s.chats;
  const sorted = [...chats].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
  });
  return NextResponse.json({ chats: sorted });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { name?: string; type?: Chat["type"]; memberIds?: string[]; creatorId?: string }
    | null;
  if (!body?.creatorId || !Array.isArray(body.memberIds)) {
    return NextResponse.json({ error: "creatorId and memberIds required" }, { status: 400 });
  }
  const s = getStore();
  const memberIds = Array.from(new Set([body.creatorId, ...body.memberIds]));
  const type = body.type ?? (memberIds.length > 2 ? "group" : "private");
  if (type === "private") {
    const existing = s.chats.find(
      (c) => c.type === "private" && c.memberIds.length === 2 && memberIds.every((m) => c.memberIds.includes(m))
    );
    if (existing) return NextResponse.json({ chat: existing });
  }
  const chat: Chat = {
    id: `c-${Date.now().toString(36)}`,
    name: type === "private" ? null : (body.name ?? "گروه جدید"),
    type,
    avatar: null,
    isPinned: false,
    memberIds,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
  };
  s.chats.unshift(chat);
  return NextResponse.json({ chat }, { status: 201 });
}
