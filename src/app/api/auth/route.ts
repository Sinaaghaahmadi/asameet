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
