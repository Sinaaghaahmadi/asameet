import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Poll call state + the other side's signals newer than `?after=`. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    const after = Number(req.nextUrl.searchParams.get("after") ?? "0") || 0;
    return NextResponse.json(await rpc("api_call_poll", { p_token: token, p_call_id: id, p_after: after }));
  } catch (e) {
    return errorResponse(e);
  }
}

/** accept / decline / signal (WebRTC offer, answer, ICE candidates). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { action?: string; payload?: unknown } | null;
    if (body?.action === "signal") {
      if (!body.payload || typeof body.payload !== "object") throw new ApiError("bad_request", 400);
      await rpc("api_call_signal", { p_token: token, p_call_id: id, p_payload: body.payload });
      return NextResponse.json({});
    }
    if (body?.action === "accept" || body?.action === "decline") {
      return NextResponse.json(await rpc("api_call_answer", { p_token: token, p_call_id: id, p_action: body.action }));
    }
    throw new ApiError("bad_request", 400);
  } catch (e) {
    return errorResponse(e);
  }
}
