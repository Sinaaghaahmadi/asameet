import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function GET() {
  const s = getStore();
  return NextResponse.json({ users: s.users });
}
