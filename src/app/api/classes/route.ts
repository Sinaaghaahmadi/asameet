import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

export async function GET() {
  try {
    const token = await requireToken();
    return NextResponse.json(await rpc("api_classes", { p_token: token }));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as { title?: string } | null;
    const data = await rpc("api_class_create", { p_token: token, p_title: body?.title ?? "" });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    const body = (await req.json().catch(() => null)) as {
      classId?: string;
      action?: "join" | "leave" | "attendance" | "end";
      userId?: string;
      present?: boolean;
    } | null;
    const data = await rpc("api_class_action", {
      p_token: token,
      p_class_id: body?.classId ?? null,
      p_action: body?.action ?? "",
      p_user_id: body?.userId ?? null,
      p_present: body?.present ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
