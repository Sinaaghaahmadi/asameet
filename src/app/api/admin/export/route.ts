import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

/** Excel-compatible CSV export (UTF-8 BOM so Persian text opens correctly in Excel). */

function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "users";
  const s = getStore();

  let rows: string[][] = [];
  if (kind === "users" || kind === "full") {
    rows.push(["username", "displayName", "role", "status", "isOnline", "lastSeen", "country"]);
    for (const u of s.users) {
      rows.push([u.username, u.displayName, u.role, u.isSuspended ? "suspended" : u.status, String(u.isOnline), u.lastSeen, u.country ?? ""]);
    }
  }
  if (kind === "meetings" || kind === "full") {
    if (kind === "full") rows.push([]);
    rows.push(["title", "type", "status", "link", "participants", "maxParticipants", "isRecording", "startsAt"]);
    for (const m of s.meetings) {
      rows.push([m.title, m.type, m.status, m.link, String(m.participantIds.length), String(m.maxParticipants), String(m.isRecording), m.startsAt]);
    }
  }
  if (kind === "classes" || kind === "full") {
    if (kind === "full") rows.push([]);
    rows.push(["title", "teacherId", "status", "students", "startsAt"]);
    for (const c of s.classes) {
      rows.push([c.title, c.teacherId, c.status, String(c.studentIds.length), c.startsAt]);
    }
  }
  if (kind === "sample") {
    rows = [
      ["username", "displayName", "role"],
      ["newuser1", "کاربر نمونه یک", "user"],
      ["newteacher", "معلم نمونه", "teacher"],
    ];
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asameet-${kind}.csv"`,
    },
  });
}
