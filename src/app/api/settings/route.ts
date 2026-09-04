import { NextRequest, NextResponse } from "next/server";
import { ApiError, assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Merge a partial settings object into the account's settings blob. */
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("bad_request", 400);
    return NextResponse.json(await rpc("api_update_settings", { p_token: token, p_settings: body }));
  } catch (e) {
    return errorResponse(e);
  }
}
