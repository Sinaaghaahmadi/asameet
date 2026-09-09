import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
  userAgentOf,
} from "@/lib/server/api";
import { pushPublicKey } from "@/lib/server/push";

export const runtime = "nodejs";

/** The VAPID application key the service worker subscribes with. */
export async function GET() {
  return NextResponse.json({ key: pushPublicKey });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    } | null;
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth)
      throw new ApiError("bad_request", 400);
    await rpc("api_push_subscribe", {
      p_token: token,
      p_endpoint: body.endpoint,
      p_p256dh: body.keys.p256dh,
      p_auth: body.keys.auth,
      p_user_agent: userAgentOf(req),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      endpoint?: string;
    } | null;
    if (!body?.endpoint) throw new ApiError("bad_request", 400);
    await rpc("api_push_unsubscribe", {
      p_token: token,
      p_endpoint: body.endpoint,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
