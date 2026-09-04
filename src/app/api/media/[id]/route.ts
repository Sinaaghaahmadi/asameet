import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Stream a media blob to a chat member. Ids are unguessable, so cache privately. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = await requireToken();
    const media = await rpc<{ mime: string; size: number; data: string }>(
      "api_media",
      {
        p_token: token,
        p_media_id: id,
      },
    );
    const bytes = Buffer.from(media.data, "base64");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": media.mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
