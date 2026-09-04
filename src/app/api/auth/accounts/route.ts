import { NextResponse } from "next/server";
import {
  accountTokens,
  attachAccounts,
  errorResponse,
  rpc,
  sessionToken,
} from "@/lib/server/api";
import type { User } from "@/lib/types";

/** Every account signed in on this browser; expired ones are pruned. */
export async function GET() {
  try {
    const current = await sessionToken();
    const tokens = await accountTokens();
    const accounts: { user: User; current: boolean }[] = [];
    const alive: string[] = [];
    for (const t of tokens) {
      const who = await rpc<{ user: User }>("api_me", { p_token: t }).catch(
        () => null,
      );
      if (!who) continue;
      if (accounts.some((a) => a.user.id === who.user.id)) continue;
      alive.push(t);
      accounts.push({ user: who.user, current: t === current });
    }
    return attachAccounts(NextResponse.json({ accounts }), alive);
  } catch (e) {
    return errorResponse(e);
  }
}
