import { NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_admin_stats", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}
