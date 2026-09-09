import { NextRequest, NextResponse, after } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";
import { chatTargets, sendPush } from "@/lib/server/push";
import type { Message, MessageMeta, MessageType } from "@/lib/types";

export const runtime = "nodejs";

/** One line of preview text for a notification, whatever the message type. */
function previewOf(m: Message | undefined, fallback: string): string {
  if (!m) return fallback;
  if (m.content?.trim()) return m.content.trim().slice(0, 140);
  switch (m.type) {
    case "image":
      return "\u{1F5BC}\uFE0F \u0639\u06A9\u0633";
    case "video":
      return "\u{1F3AC} \u0648\u06CC\u062F\u06CC\u0648";
    case "voice":
      return "\u{1F3A4} \u067E\u06CC\u0627\u0645 \u0635\u0648\u062A\u06CC";
    case "file":
      return "\u{1F4CE} \u0641\u0627\u06CC\u0644";
    default:
      return fallback;
  }
}

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
      chatTitle?: string;
    } | null;
    const data = await rpc<{ message?: Message }>("api_send_message", {
      p_token: token,
      p_chat_id: id,
      p_content: body?.content ?? "",
      p_type: body?.type ?? "text",
      p_reply_to: body?.replyToId ?? null,
      p_media_id: body?.mediaId ?? null,
      p_meta: body?.meta && typeof body.meta === "object" ? body.meta : {},
    });

    // Members with the app closed hear about this only through web push;
    // members with a tab open are filtered out by the presence lease.
    after(async () => {
      const targets = await chatTargets(token, id);
      await sendPush(token, targets, {
        kind: "message",
        chatId: id,
        title: body?.chatTitle?.slice(0, 80) || "Asatalk",
        body: previewOf(data.message, "\u067E\u06CC\u0627\u0645 \u062C\u062F\u06CC\u062F"),
        tag: `chat:${id}`,
      });
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
