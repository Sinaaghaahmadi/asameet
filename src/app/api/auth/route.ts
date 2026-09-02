import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  assertSameOrigin,
  attachSession,
  clearSession,
  errorResponse,
  requireToken,
  rpc,
  sessionToken,
} from "@/lib/server/api";
import type { User } from "@/lib/types";

interface AuthResult {
  user: User;
  token: string;
}

/**
 * Opaque per-client key for the login rate limit, so a stranger hammering a
 * username only locks out their own address, not the account's owner.
 */
function clientKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Login (default) or signup (`mode: "signup"`). Sets the session cookie. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = (await req.json().catch(() => null)) as {
      mode?: string;
      username?: string;
      password?: string;
      displayName?: string;
    } | null;
    if (!body?.username || typeof body.password !== "string") {
      throw new ApiError("bad_request", 400);
    }

    const data =
      body.mode === "signup"
        ? await rpc<AuthResult>("api_signup", {
            p_username: body.username,
            p_password: body.password,
            p_display_name: body.displayName ?? body.username,
          })
        : await rpc<AuthResult>("api_login", {
            p_username: body.username,
            p_password: body.password,
            p_client: clientKey(req),
          });

    // The token travels only in the httpOnly cookie, never in the body.
    return attachSession(NextResponse.json({ user: data.user }), data.token);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Who am I — validates the cookie session against the database. */
export async function GET() {
  try {
    const token = await requireToken();
    const data = await rpc<{ user: User }>("api_me", { p_token: token });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Logout — revokes the session server-side and clears the cookie. */
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await sessionToken();
    if (token) await rpc("api_logout", { p_token: token }).catch(() => undefined);
    return clearSession(NextResponse.json({}));
  } catch (e) {
    return errorResponse(e);
  }
}
