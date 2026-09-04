import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function GET(req: NextRequest) {
  try {
    const token = await requireToken();
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const chatId = req.nextUrl.searchParams.get("chatId");
    return NextResponse.json(await rpc("api_search_messages", { p_token: token, p_query: q, p_chat_id: chatId }));
  } catch (e) {
    return errorResponse(e);
  }
}
