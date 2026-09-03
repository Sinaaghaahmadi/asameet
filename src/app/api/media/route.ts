import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Upload one media blob (base64) into a chat; returns its id. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { chatId?: string; mime?: string; data?: string } | null;
    if (!body?.chatId || !body.mime || !body.data) throw new ApiError("bad_request", 400);
    const data = await rpc<{ id: string }>("api_upload_media", {
      p_token: token,
      p_chat_id: body.chatId,
      p_mime: body.mime,
      p_data: body.data,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
