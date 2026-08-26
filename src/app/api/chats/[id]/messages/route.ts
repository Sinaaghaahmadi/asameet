import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { Message, MessageType } from "@/lib/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = getStore();
  const messages = s.messages
    .filter((m) => m.chatId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { senderId?: string; content?: string; type?: MessageType; replyToId?: string | null }
    | null;
  if (!body?.senderId || !body.content?.trim()) {
    return NextResponse.json({ error: "senderId and content required" }, { status: 400 });
  }
  const s = getStore();
  const chat = s.chats.find((c) => c.id === id);
  if (!chat) return NextResponse.json({ error: "chat not found" }, { status: 404 });

  const message: Message = {
    id: `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
    chatId: id,
    senderId: body.senderId,
    content: body.content.trim(),
    type: body.type ?? "text",
    replyToId: body.replyToId ?? null,
    forwardedFrom: null,
    isRead: false,
    isPinned: false,
    reactions: [],
    createdAt: new Date().toISOString(),
  };
  s.messages.push(message);
  chat.lastMessage = message.content;
  chat.lastMessageAt = message.createdAt;
  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { messageId?: string; action?: "pin" | "unpin" | "read" | "react"; emoji?: string; userId?: string }
    | null;
  if (!body?.messageId || !body.action) {
    return NextResponse.json({ error: "messageId and action required" }, { status: 400 });
  }
  const s = getStore();
  const msg = s.messages.find((m) => m.id === body.messageId && m.chatId === id);
  if (!msg) return NextResponse.json({ error: "message not found" }, { status: 404 });

  if (body.action === "pin") msg.isPinned = true;
  if (body.action === "unpin") msg.isPinned = false;
  if (body.action === "read") msg.isRead = true;
  if (body.action === "react" && body.emoji && body.userId) {
    const existing = msg.reactions.find((r) => r.emoji === body.emoji);
    if (existing) {
      if (existing.userIds.includes(body.userId)) {
        existing.userIds = existing.userIds.filter((u) => u !== body.userId);
        if (existing.userIds.length === 0) msg.reactions = msg.reactions.filter((r) => r !== existing);
      } else {
        existing.userIds.push(body.userId);
      }
    } else {
      msg.reactions.push({ emoji: body.emoji, userIds: [body.userId] });
    }
  }
  return NextResponse.json({ message: msg });
}
