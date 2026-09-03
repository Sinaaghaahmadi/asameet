import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

/** "Saved Messages" — a private chat with yourself, created on first use. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    return NextResponse.json(await rpc("api_saved_chat", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}
