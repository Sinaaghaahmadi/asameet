import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side bridge to the Asameet database (Supabase Postgres).
 *
 * All data access goes through `public.api_*` SECURITY DEFINER functions,
 * which authenticate every call with an opaque session token; the anon key
 * below can do nothing except invoke them, which is why it is safe to keep
 * in the repository. Override via env only to point at a different project.
 */

const SUPABASE_URL =
  process.env.ASAMEET_SUPABASE_URL ?? "https://gqrmsybhjibhhfzfthfh.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.ASAMEET_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxcm1zeWJoamliaGhmemZ0aGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNTY0NjQsImV4cCI6MjEwMzczMjQ2NH0.GlO0xnos-Q7klm9O73DZpXn89POPssWF3a1svOL5Wqk";

export const SESSION_COOKIE = "asameet_session";
/** Asatalk multi-account: every signed-in token, "|"-separated, httpOnly. */
export const ACCOUNTS_COOKIE = "asameet_accounts";
export const MAX_ACCOUNTS = 5;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // matches the DB session lifetime

/** Error carrying a machine-readable code the client maps to a localized message. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(code);
  }
}

const ERROR_STATUS: Record<string, number> = {
  unauthorized: 401,
  invalid_credentials: 401,
  suspended: 403,
  forbidden: 403,
  not_found: 404,
  username_taken: 409,
  meeting_full: 409,
  too_many_attempts: 429,
  weak_password: 400,
  invalid_username: 400,
  invalid_display_name: 400,
  bad_request: 400,
};

/** Call a database RPC; throws ApiError with a stable code on failure. */
export async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("upstream_unreachable", 502);
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : "server_error";
    const code = message in ERROR_STATUS ? message : "server_error";
    throw new ApiError(code, ERROR_STATUS[code] ?? 500);
  }
  // api_login reports auth failures as data so attempts are recorded.
  if (data && typeof data === "object" && "error" in data) {
    const code = String((data as { error: unknown }).error);
    throw new ApiError(code, ERROR_STATUS[code] ?? 400);
  }
  return data as T;
}

export async function sessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireToken(): Promise<string> {
  const token = await sessionToken();
  if (!token) throw new ApiError("unauthorized", 401);
  return token;
}

/**
 * CSRF guard for state-changing requests: with a `lax` cookie the only
 * cross-site vector left is a top-level form POST, which always carries an
 * Origin header — reject it when it names a different host.
 */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (host && new URL(origin).host !== host) throw new ApiError("forbidden", 403);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("forbidden", 403); // unparsable Origin
  }
}

export function attachSession(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Self-hosted plain-HTTP (no TLS yet) can opt out; never do this on a public host.
    secure: process.env.NODE_ENV === "production" && process.env.ASAMEET_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

/** Tokens of every account signed in on this browser (current one included). */
export async function accountTokens(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(ACCOUNTS_COOKIE)?.value ?? "";
  const current = jar.get(SESSION_COOKIE)?.value;
  const list = raw.split("|").filter((t) => /^[a-f0-9]{64}$/.test(t));
  if (current && !list.includes(current)) list.unshift(current);
  return Array.from(new Set(list)).slice(0, MAX_ACCOUNTS);
}

export function attachAccounts(res: NextResponse, tokens: string[]): NextResponse {
  const value = tokens.slice(0, MAX_ACCOUNTS).join("|");
  res.cookies.set(ACCOUNTS_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ASAMEET_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: value ? SESSION_MAX_AGE : 0,
  });
  return res;
}

/** Browser identity stored with the session so the user can review devices. */
export function userAgentOf(req: NextRequest): string {
  return (req.headers.get("user-agent") ?? "").slice(0, 200);
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.code }, { status: e.status });
  }
  console.error("api route failure:", e);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
