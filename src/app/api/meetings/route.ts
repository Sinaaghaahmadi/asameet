import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";
import type { MeetingType } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const token = await requireToken();
    const type = req.nextUrl.searchParams.get("type");
    return NextResponse.json(await rpc("api_meetings", { p_token: token, p_type: type }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      title?: string;
      type?: MeetingType;
      maxParticipants?: number;
    } | null;
    const data = await rpc("api_meeting_create", {
      p_token: token,
      p_title: body?.title ?? "",
      p_type: body?.type ?? "meeting",
      p_max_participants: body?.maxParticipants ?? 100,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
