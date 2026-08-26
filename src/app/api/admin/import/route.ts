import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { Role, User } from "@/lib/types";

/** Import users from a CSV file (username,displayName,role). */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const text = (await file.text()).replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const s = getStore();
  let imported = 0;
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const [username, displayName, role] = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!username || s.users.some((u) => u.username === username)) {
      skipped += 1;
      continue;
    }
    const validRoles: Role[] = ["user", "teacher", "host", "admin"];
    const user: User = {
      id: `u-${Date.now().toString(36)}-${imported}`,
      username,
      displayName: displayName || username,
      avatar: null,
      role: validRoles.includes(role as Role) ? (role as Role) : "user",
      status: "offline",
      isOnline: false,
      isSuspended: false,
      lastSeen: new Date().toISOString(),
    };
    s.users.push(user);
    s.passwords[username] = "123456";
    imported += 1;
  }

  return NextResponse.json({ imported, skipped });
}
