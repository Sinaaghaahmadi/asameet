import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  accountTokens,
  assertSameOrigin,
  attachAccounts,
  attachSession,
  errorResponse,
  rpc,
} from "@/lib/server/api";
import type { User } from "@/lib/types";

/** Make one of the stored accounts the active session. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = (await req.json().catch(() => null)) as {
      userId?: string;
    } | null;
    if (!body?.userId) throw new ApiError("bad_request", 400);
    const tokens = await accountTokens();
    for (const t of tokens) {
      const who = await rpc<{ user: User; settings: Record<string, unknown> }>(
        "api_me",
        { p_token: t },
      ).catch(() => null);
      if (who && who.user.id === body.userId) {
        const res = attachSession(NextResponse.json(who), t);
        return attachAccounts(res, [t, ...tokens.filter((x) => x !== t)]);
      }
    }
    throw new ApiError("not_found", 404);
  } catch (e) {
    return errorResponse(e);
  }
}
