import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Per-member chat preferences: pin, mute. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { pinned?: boolean; muted?: boolean; archived?: boolean } | null;
    await rpc("api_chat_prefs", {
      p_token: token,
      p_chat_id: id,
      p_pinned: typeof body?.pinned === "boolean" ? body.pinned : null,
      p_muted: typeof body?.muted === "boolean" ? body.muted : null,
      p_archived: typeof body?.archived === "boolean" ? body.archived : null,
    });
    return NextResponse.json({});
  } catch (e) {
    return errorResponse(e);
  }
}
