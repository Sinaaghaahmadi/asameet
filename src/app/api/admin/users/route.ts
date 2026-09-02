import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_users", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

/** suspend / activate / set-role — admin-only, enforced in the database. */
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      userId?: string;
      action?: "suspend" | "activate" | "set-role";
      role?: string;
    } | null;
    const data = await rpc("api_admin_user_action", {
      p_token: token,
      p_user_id: body?.userId ?? null,
      p_action: body?.action ?? "",
      p_role: body?.role ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
