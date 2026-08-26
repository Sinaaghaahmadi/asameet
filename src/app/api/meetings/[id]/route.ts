import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = getStore();
  const meeting = s.meetings.find((m) => m.id === id || m.link === id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ meeting });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { action?: "join" | "leave" | "start-recording" | "stop-recording" | "end"; userId?: string }
    | null;
  if (!body?.action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const s = getStore();
  const meeting = s.meetings.find((m) => m.id === id || m.link === id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });

  switch (body.action) {
    case "join":
      if (body.userId && !meeting.participantIds.includes(body.userId)) {
        if (meeting.participantIds.length >= meeting.maxParticipants) {
          return NextResponse.json({ error: "meeting full" }, { status: 409 });
        }
        meeting.participantIds.push(body.userId);
      }
      if (meeting.status === "scheduled") meeting.status = "active";
      break;
    case "leave":
      if (body.userId) meeting.participantIds = meeting.participantIds.filter((p) => p !== body.userId);
      break;
    case "start-recording":
      meeting.isRecording = true;
      break;
    case "stop-recording":
      meeting.isRecording = false;
      break;
    case "end":
      meeting.status = "ended";
      meeting.isRecording = false;
      break;
  }
  return NextResponse.json({ meeting });
}
