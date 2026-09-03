import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Active devices of the signed-in account. */
export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_sessions", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

/** Terminate one device (`?id=`) or every other device. */
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    await rpc("api_session_terminate", { p_token: token, p_id: req.nextUrl.searchParams.get("id") });
    return NextResponse.json({});
  } catch (e) {
    return errorResponse(e);
  }
}
