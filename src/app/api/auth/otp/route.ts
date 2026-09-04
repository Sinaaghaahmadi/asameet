import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  accountTokens,
  assertSameOrigin,
  attachAccounts,
  attachSession,
  errorResponse,
  rpc,
  userAgentOf,
  MAX_ACCOUNTS,
} from "@/lib/server/api";
import type { User } from "@/lib/types";

/**
 * Phone / email sign-in with a one-time code.
 *
 * Delivery: when ASATALK_OTP_WEBHOOK_URL is set, the code is POSTed there
 * (`{ identifier, kind, code }`) for an SMS / email provider to send. Without
 * a provider the code is returned to the client as `demoCode` so the flow
 * stays usable on preview deployments — set the webhook before launch.
 */
function clientKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function normalize(raw: string): string {
  const v = raw.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (v.includes("@")) return v.toLowerCase();
  let digits = v.replace(/[\s()-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (/^0\d{10}$/.test(digits)) digits = `+98${digits.slice(1)}`; // Iranian local format
  if (!digits.startsWith("+") && /^\d{10,15}$/.test(digits)) digits = `+${digits}`;
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = (await req.json().catch(() => null)) as { identifier?: string; code?: string; displayName?: string } | null;
    if (!body?.identifier) throw new ApiError("bad_request", 400);
    const identifier = normalize(body.identifier);

    if (!body.code) {
      const data = await rpc<{ kind: "phone" | "email"; code: string; ttl: number; known: boolean }>("api_otp_request", {
        p_identifier: identifier,
        p_client: clientKey(req),
      });
      const webhook = process.env.ASATALK_OTP_WEBHOOK_URL;
      let delivered = false;
      if (webhook) {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(process.env.ASATALK_OTP_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.ASATALK_OTP_WEBHOOK_TOKEN}` } : {}) },
          body: JSON.stringify({ identifier, kind: data.kind, code: data.code }),
        }).catch(() => null);
        delivered = !!res?.ok;
      }
      return NextResponse.json({
        kind: data.kind,
        known: data.known,
        ttl: data.ttl,
        identifier,
        ...(delivered ? {} : { demoCode: data.code }),
      });
    }

    const data = await rpc<{ user: User; token: string; isNew: boolean }>("api_otp_verify", {
      p_identifier: identifier,
      p_code: body.code,
      p_display_name: body.displayName ?? null,
      p_user_agent: userAgentOf(req),
    });
    const existing = await accountTokens();
    const others: string[] = [];
    for (const t of existing) {
      if (t === data.token) continue;
      const who = await rpc<{ user: User }>("api_me", { p_token: t }).catch(() => null);
      if (who && who.user.id !== data.user.id) others.push(t);
    }
    if (others.length >= MAX_ACCOUNTS) throw new ApiError("too_many_accounts", 409);
    const res = attachSession(NextResponse.json({ user: data.user, isNew: data.isNew }), data.token);
    return attachAccounts(res, [data.token, ...others]);
  } catch (e) {
    return errorResponse(e);
  }
}
