import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { ClassSession } from "@/lib/types";

export async function GET() {
  const s = getStore();
  return NextResponse.json({ classes: s.classes });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { title?: string; teacherId?: string } | null;
  if (!body?.title?.trim() || !body.teacherId) {
    return NextResponse.json({ error: "title and teacherId required" }, { status: 400 });
  }
  const s = getStore();
  const cls: ClassSession = {
    id: `cl-${Date.now().toString(36)}`,
    title: body.title.trim(),
    teacherId: body.teacherId,
    status: "active",
    studentIds: [],
    attendance: {},
    startsAt: new Date().toISOString(),
  };
  s.classes.unshift(cls);
  return NextResponse.json({ class: cls }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { classId?: string; action?: "join" | "leave" | "attendance" | "end"; userId?: string; present?: boolean }
    | null;
  if (!body?.classId || !body.action) {
    return NextResponse.json({ error: "classId and action required" }, { status: 400 });
  }
  const s = getStore();
  const cls = s.classes.find((c) => c.id === body.classId);
  if (!cls) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "join" && body.userId) {
    if (!cls.studentIds.includes(body.userId) && body.userId !== cls.teacherId) cls.studentIds.push(body.userId);
    cls.attendance[body.userId] = true;
    if (cls.status === "scheduled") cls.status = "active";
  }
  if (body.action === "leave" && body.userId) {
    cls.attendance[body.userId] = false;
  }
  if (body.action === "attendance" && body.userId !== undefined) {
    cls.attendance[body.userId!] = body.present ?? false;
  }
  if (body.action === "end") cls.status = "ended";
  return NextResponse.json({ class: cls });
}
