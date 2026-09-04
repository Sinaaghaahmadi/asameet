import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      current?: string;
      next?: string;
    } | null;
    await rpc("api_change_password", {
      p_token: token,
      p_current: body?.current ?? "",
      p_new: body?.next ?? "",
    });
    return NextResponse.json({});
  } catch (e) {
    return errorResponse(e);
  }
}
