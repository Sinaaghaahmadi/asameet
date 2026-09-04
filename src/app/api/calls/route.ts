import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";
import type { Call } from "@/lib/types";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_calls", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      type?: Call["type"];
      peerId?: string;
    } | null;
    const data = await rpc("api_call_start", {
      p_token: token,
      p_type: body?.type ?? "audio",
      p_peer_id: body?.peerId ?? null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      callId?: string;
      duration?: number;
    } | null;
    const data = await rpc("api_call_end", {
      p_token: token,
      p_call_id: body?.callId ?? null,
      p_duration: body?.duration ?? 0,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
