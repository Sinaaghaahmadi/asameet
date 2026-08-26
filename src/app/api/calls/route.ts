import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { Call } from "@/lib/types";

export async function GET(req: NextRequest) {
  const s = getStore();
  const userId = req.nextUrl.searchParams.get("userId");
  const calls = userId ? s.calls.filter((c) => c.initiatorId === userId || c.peerId === userId) : s.calls;
  const sorted = [...calls].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ calls: sorted });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { type?: Call["type"]; initiatorId?: string; peerId?: string }
    | null;
  if (!body?.initiatorId || !body.peerId) {
    return NextResponse.json({ error: "initiatorId and peerId required" }, { status: 400 });
  }
  const s = getStore();
  const call: Call = {
    id: `call-${Date.now().toString(36)}`,
    type: body.type ?? "audio",
    status: "active",
    direction: "outgoing",
    initiatorId: body.initiatorId,
    peerId: body.peerId,
    duration: null,
    createdAt: new Date().toISOString(),
  };
  s.calls.unshift(call);
  return NextResponse.json({ call }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { callId?: string; duration?: number } | null;
  if (!body?.callId) return NextResponse.json({ error: "callId required" }, { status: 400 });
  const s = getStore();
  const call = s.calls.find((c) => c.id === body.callId);
  if (!call) return NextResponse.json({ error: "not found" }, { status: 404 });
  call.status = "ended";
  call.duration = body.duration ?? 0;
  return NextResponse.json({ call });
}
