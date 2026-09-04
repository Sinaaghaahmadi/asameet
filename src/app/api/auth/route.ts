import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  accountTokens,
  assertSameOrigin,
  attachAccounts,
  attachSession,
  clearSession,
  errorResponse,
  requireToken,
  rpc,
  sessionToken,
  userAgentOf,
  MAX_ACCOUNTS,
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

/**
 * Login (default) or signup (`mode: "signup"`). Sets the session cookie and
 * remembers the token in the multi-account list (Asatalk lets one browser
 * hold several accounts, Telegram-style).
 */
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
    const ua = userAgentOf(req);
    const data =
      body.mode === "signup"
        ? await rpc<AuthResult>("api_signup", {
            p_username: body.username,
            p_password: body.password,
            p_display_name: body.displayName ?? body.username,
            p_user_agent: ua,
          })
        : await rpc<AuthResult>("api_login", {
            p_username: body.username,
            p_password: body.password,
            p_client: clientKey(req),
            p_user_agent: ua,
          });

    // Replace an older session of the same account instead of stacking them.
    const existing = await accountTokens();
    const others: string[] = [];
    for (const t of existing) {
      if (t === data.token) continue;
      const who = await rpc<{ user: User }>("api_me", { p_token: t }).catch(
        () => null,
      );
      if (who && who.user.id !== data.user.id) others.push(t);
    }
    if (others.length >= MAX_ACCOUNTS)
      throw new ApiError("too_many_accounts", 409);

    // The token travels only in the httpOnly cookie, never in the body.
    const res = attachSession(
      NextResponse.json({ user: data.user }),
      data.token,
    );
    return attachAccounts(res, [data.token, ...others]);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Who am I — validates the cookie session; also returns settings. */
export async function GET() {
  try {
    const token = await requireToken();
    const data = await rpc<{ user: User; settings: Record<string, unknown> }>(
      "api_me",
      { p_token: token },
    );
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * Logout. `?keep=1` (Asatalk) signs out only the current account and switches
 * to the next stored one; without it every account on this browser is revoked.
 */
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await sessionToken();
    const keep = req.nextUrl.searchParams.get("keep") === "1";
    const tokens = await accountTokens();
    if (token)
      await rpc("api_logout", { p_token: token }).catch(() => undefined);
    const rest = tokens.filter((t) => t !== token);
    if (!keep) {
      for (const t of rest)
        await rpc("api_logout", { p_token: t }).catch(() => undefined);
      return attachAccounts(
        clearSession(NextResponse.json({ user: null })),
        [],
      );
    }
    for (const next of rest) {
      const who = await rpc<{ user: User }>("api_me", { p_token: next }).catch(
        () => null,
      );
      if (who) {
        const res = attachSession(NextResponse.json({ user: who.user }), next);
        return attachAccounts(res, rest);
      }
    }
    return attachAccounts(clearSession(NextResponse.json({ user: null })), []);
  } catch (e) {
    return errorResponse(e);
  }
}
