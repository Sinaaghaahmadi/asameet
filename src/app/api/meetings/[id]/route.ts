import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    return NextResponse.json(await rpc("api_meeting_get", { p_token: token, p_id_or_link: id }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { action?: string } | null;
    const data = await rpc("api_meeting_action", {
      p_token: token,
      p_id_or_link: id,
      p_action: body?.action ?? "",
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
