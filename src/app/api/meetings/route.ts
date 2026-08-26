import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { Meeting, MeetingType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const s = getStore();
  const type = req.nextUrl.searchParams.get("type");
  const meetings = type ? s.meetings.filter((m) => m.type === type) : s.meetings;
  const sorted = [...meetings].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return NextResponse.json({ meetings: sorted });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { title?: string; type?: MeetingType; hostId?: string; maxParticipants?: number; startNow?: boolean }
    | null;
  if (!body?.title?.trim() || !body.hostId) {
    return NextResponse.json({ error: "title and hostId required" }, { status: 400 });
  }
  const s = getStore();
  const slug = body.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const meeting: Meeting = {
    id: `mt-${Date.now().toString(36)}`,
    title: body.title.trim(),
    type: body.type ?? "meeting",
    link: `${slug || "meet"}-${Math.random().toString(36).slice(2, 7)}`,
    status: body.startNow === false ? "scheduled" : "active",
    hostId: body.hostId,
    maxParticipants: body.maxParticipants ?? 100,
    isRecording: false,
    participantIds: [body.hostId],
    startsAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  s.meetings.unshift(meeting);
  return NextResponse.json({ meeting }, { status: 201 });
}
