import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";
import type { MessageType } from "@/lib/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    return NextResponse.json(await rpc("api_messages", { p_token: token, p_chat_id: id }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      content?: string;
      type?: MessageType;
      replyToId?: string | null;
    } | null;
    const data = await rpc("api_send_message", {
      p_token: token,
      p_chat_id: id,
      p_content: body?.content ?? "",
      p_type: body?.type ?? "text",
      p_reply_to: body?.replyToId ?? null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      messageId?: string;
      action?: "pin" | "unpin" | "read" | "react";
      emoji?: string;
    } | null;
    const data = await rpc("api_message_action", {
      p_token: token,
      p_chat_id: id,
      p_message_id: body?.messageId ?? null,
      p_action: body?.action ?? "",
      p_emoji: body?.emoji ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
