import { NextRequest, NextResponse, after } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";
import { callTargets, sendPush } from "@/lib/server/push";
import type { Call } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_calls", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

/** Ring one person (`peerId`) or start/join a group call in a chat (`chatId`). */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      type?: Call["type"];
      peerId?: string;
      chatId?: string;
      title?: string;
    } | null;
    const data = await rpc<{ call: Call }>("api_call_start", {
      p_token: token,
      p_type: body?.type ?? "audio",
      p_peer_id: body?.peerId ?? null,
      p_chat_id: body?.chatId ?? null,
    });

    // A ringing phone with the app closed only finds out through push.
    const call = data.call;
    if (call?.id) {
      after(async () => {
        const targets = await callTargets(token, call.id);
        await sendPush(token, targets, {
          kind: "call",
          callId: call.id,
          chatId: call.chatId ?? null,
          type: call.type,
          title: body?.title ?? "Asatalk",
          body: call.type === "video" ? "تماس تصویری" : "تماس صوتی",
        });
      });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      callId?: string;
      duration?: number;
    } | null;
    const data = await rpc("api_call_end", {
      p_token: token,
      p_call_id: body?.callId ?? null,
      p_duration: body?.duration ?? 0,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
