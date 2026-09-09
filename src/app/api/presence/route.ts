import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

/**
 * Presence heartbeat. The client renews a short lease while the app is
 * visible and releases it the moment the page is hidden or closed, so
 * "online" means "actually looking at Asatalk" rather than "polled recently".
 *
 * Deliberately no same-origin guard: this is idempotent, carries no payload
 * worth forging, and is also fired from `sendBeacon` on pagehide, where the
 * browser may omit the Origin header shape we expect.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await requireToken();
    const state =
      req.nextUrl.searchParams.get("state") ??
      (await req
        .json()
        .then((b: { state?: string }) => b?.state)
        .catch(() => undefined)) ??
      "online";
    await rpc("api_presence", {
      p_token: token,
      p_state: state === "offline" ? "offline" : "online",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
