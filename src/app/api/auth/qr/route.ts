import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  accountTokens,
  assertSameOrigin,
  attachAccounts,
  attachSession,
  errorResponse,
  requireToken,
  rpc,
  userAgentOf,
  MAX_ACCOUNTS,
} from "@/lib/server/api";
import type { User } from "@/lib/types";

/**
 * Sign in by QR, Telegram-style.
 *
 * The signed-out device asks for a ticket and renders its code as a QR. A
 * device that is already signed in scans it, sees which browser is asking and
 * approves; the approval mints a brand-new session on the server. The waiting
 * device polls, and the token is handed to it exactly once — into an httpOnly
 * cookie, never into the page — after which the ticket is destroyed.
 *
 * `client` binds the ticket to the browser that created it, so a code
 * photographed off someone's screen cannot be redeemed anywhere else.
 */

/** Stable, opaque per-browser key derived from the address, not from a cookie. */
function clientKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256")
    .update(`${ip}:${userAgentOf(req)}`)
    .digest("hex")
    .slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = (await req.json().catch(() => null)) as {
      action?: "create" | "poll" | "peek" | "approve" | "reject";
      code?: string;
    } | null;
    const action = body?.action ?? "create";

    if (action === "create") {
      return NextResponse.json(
        await rpc("api_qr_create", {
          p_client: clientKey(req),
          p_user_agent: userAgentOf(req),
        }),
      );
    }

    if (!body?.code) throw new ApiError("bad_request", 400);

    if (action === "poll") {
      const data = await rpc<{
        status: "pending" | "approved" | "rejected" | "expired";
        user?: User;
        token?: string;
      }>("api_qr_poll", { p_code: body.code, p_client: clientKey(req) });
      if (data.status !== "approved" || !data.token || !data.user)
        return NextResponse.json({ status: data.status });

      // Same account bookkeeping as a password login: replace an older
      // session of this account rather than stacking a second one.
      const existing = await accountTokens();
      const others: string[] = [];
      for (const t of existing) {
        if (t === data.token) continue;
        const who = await rpc<{ user: User }>("api_me", { p_token: t }).catch(
          () => null,
        );
        if (who && who.user.id !== data.user.id) others.push(t);
      }
      const res = attachSession(
        NextResponse.json({ status: "approved", user: data.user }),
        data.token,
      );
      return attachAccounts(res, [data.token, ...others.slice(0, MAX_ACCOUNTS - 1)]);
    }

    // The remaining actions happen on the already-signed-in device.
    const token = await requireToken();
    if (action === "peek") {
      return NextResponse.json(
        await rpc("api_qr_peek", { p_token: token, p_code: body.code }),
      );
    }
    if (action === "approve" || action === "reject") {
      return NextResponse.json(
        await rpc("api_qr_approve", {
          p_token: token,
          p_code: body.code,
          p_action: action === "reject" ? "reject" : "approve",
        }),
      );
    }
    throw new ApiError("bad_request", 400);
  } catch (e) {
    return errorResponse(e);
  }
}
