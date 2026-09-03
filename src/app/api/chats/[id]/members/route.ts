import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** add / remove / promote / demote / leave / delete */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { action?: string; userId?: string } | null;
    const data = await rpc("api_chat_members", {
      p_token: token,
      p_chat_id: id,
      p_action: body?.action ?? "",
      p_user_id: body?.userId ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
