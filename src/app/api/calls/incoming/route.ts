import { NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Is anyone ringing me right now? */
export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(
      await rpc("api_call_incoming", { p_token: token }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
