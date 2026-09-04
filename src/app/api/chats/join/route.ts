import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Preview (`preview: true`) or join a group/channel by invite code or @username. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { ref?: string; preview?: boolean } | null;
    const data = await rpc("api_chat_join", {
      p_token: token,
      p_ref: body?.ref ?? "",
      p_preview: body?.preview ?? false,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
