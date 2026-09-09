import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";

/** Poll call state + signals addressed to me newer than `?after=`. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    const after = Number(req.nextUrl.searchParams.get("after") ?? "0") || 0;
    return NextResponse.json(
      await rpc("api_call_poll", {
        p_token: token,
        p_call_id: id,
        p_after: after,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * accept / decline / signal / leave / presence.
 *
 * In a group call signalling is a mesh, so `to` addresses one peer; a signal
 * with no recipient is still broadcast (that is the 1:1 path).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      action?: string;
      payload?: unknown;
      to?: string | null;
      muted?: boolean;
      camera?: boolean;
    } | null;

    if (body?.action === "signal") {
      if (!body.payload || typeof body.payload !== "object")
        throw new ApiError("bad_request", 400);
      await rpc("api_call_signal", {
        p_token: token,
        p_call_id: id,
        p_payload: body.payload,
        p_to: body.to ?? null,
      });
      return NextResponse.json({});
    }
    if (body?.action === "presence") {
      await rpc("api_call_presence", {
        p_token: token,
        p_call_id: id,
        p_muted: typeof body.muted === "boolean" ? body.muted : null,
        p_camera: typeof body.camera === "boolean" ? body.camera : null,
      });
      return NextResponse.json({});
    }
    if (body?.action === "leave") {
      return NextResponse.json(
        await rpc("api_call_leave", { p_token: token, p_call_id: id }),
      );
    }
    if (body?.action === "accept" || body?.action === "decline") {
      return NextResponse.json(
        await rpc("api_call_answer", {
          p_token: token,
          p_call_id: id,
          p_action: body.action,
        }),
      );
    }
    throw new ApiError("bad_request", 400);
  } catch (e) {
    return errorResponse(e);
  }
}
