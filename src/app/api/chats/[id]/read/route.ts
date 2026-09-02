import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Mark every message in the chat as read for the signed-in member. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    return NextResponse.json(await rpc("api_mark_read", { p_token: token, p_chat_id: id }));
  } catch (e) {
    return errorResponse(e);
  }
}
