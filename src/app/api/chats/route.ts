import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";
import type { Chat } from "@/lib/types";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_chats", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      type?: Chat["type"];
      memberIds?: string[];
      description?: string;
      avatar?: string;
    } | null;
    const memberIds = Array.isArray(body?.memberIds) ? body.memberIds : [];
    const type = body?.type ?? (memberIds.length > 1 ? "group" : "private");
    const data = await rpc<{ chat: Chat }>("api_create_chat", {
      p_token: token,
      p_type: type,
      p_name: body?.name ?? null,
      p_member_ids: memberIds,
      p_description: body?.description ?? null,
      p_avatar: body?.avatar ?? null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
