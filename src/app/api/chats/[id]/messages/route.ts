import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";
import type { MessageMeta, MessageType } from "@/lib/types";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    const after = req.nextUrl.searchParams.get("after");
    return NextResponse.json(
      await rpc("api_messages", {
        p_token: token,
        p_chat_id: id,
        p_after: after,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      content?: string;
      type?: MessageType;
      replyToId?: string | null;
      mediaId?: string | null;
      meta?: MessageMeta;
    } | null;
    const data = await rpc("api_send_message", {
      p_token: token,
      p_chat_id: id,
      p_content: body?.content ?? "",
      p_type: body?.type ?? "text",
      p_reply_to: body?.replyToId ?? null,
      p_media_id: body?.mediaId ?? null,
      p_meta: body?.meta && typeof body.meta === "object" ? body.meta : {},
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      messageId?: string;
      action?:
        | "pin"
        | "unpin"
        | "read"
        | "react"
        | "edit"
        | "delete"
        | "forward"
        | "vote";
      emoji?: string;
      text?: string;
      targetChatId?: string;
    } | null;
    const data = await rpc("api_message_action", {
      p_token: token,
      p_chat_id: id,
      p_message_id: body?.messageId ?? null,
      p_action: body?.action ?? "",
      p_emoji: body?.emoji ?? null,
      p_text: body?.text ?? null,
      p_target_chat: body?.targetChatId ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
