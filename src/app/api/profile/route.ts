import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      displayName?: string;
      username?: string;
      bio?: string;
      avatar?: string;
      clearAvatar?: boolean;
      note?: string;
      clearNote?: boolean;
    } | null;
    const data = await rpc("api_update_profile", {
      p_token: token,
      p_display_name: body?.displayName ?? null,
      p_username: body?.username ?? null,
      p_bio: body?.bio ?? null,
      p_avatar: body?.avatar ?? null,
      p_clear_avatar: body?.clearAvatar ?? false,
      p_note: body?.note ?? null,
      p_clear_note: body?.clearNote ?? false,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
