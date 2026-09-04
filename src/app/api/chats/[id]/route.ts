import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  errorResponse,
  requireToken,
  rpc,
} from "@/lib/server/api";

/** Edit group/channel info (admins). */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      description?: string;
      username?: string;
      avatar?: string;
      clearAvatar?: boolean;
      resetInvite?: boolean;
    } | null;
    const data = await rpc("api_chat_update", {
      p_token: token,
      p_chat_id: id,
      p_name: body?.name ?? null,
      p_description: body?.description ?? null,
      p_username: body?.username ?? null,
      p_avatar: body?.avatar ?? null,
      p_clear_avatar: body?.clearAvatar ?? false,
      p_reset_invite: body?.resetInvite ?? false,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Delete a private chat for both sides / clear a group's history (admins). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const token = await requireToken();
    await rpc("api_chat_clear", { p_token: token, p_chat_id: id });
    return NextResponse.json({});
  } catch (e) {
    return errorResponse(e);
  }
}
