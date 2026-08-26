import { NextResponse } from "next/server";
import { computeStats } from "@/lib/server/store";

export async function GET() {
  return NextResponse.json({ stats: computeStats() });
}
