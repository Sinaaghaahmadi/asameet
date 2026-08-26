"use client";

import { computeStats, getStore } from "@/lib/server/store";
import { demoAiOutput, type AiMode } from "@/lib/ai-demo";
import type { Call, Chat, Meeting, Message, MessageType, Role, User } from "@/lib/types";

/**
 * API access layer.
 *
 * Normal deployments (Vercel / self-hosted): plain fetch against /api/*.
 * Static demo build (NEXT_PUBLIC_STATIC=1, e.g. GitHub Pages): no server
 * exists, so the same in-memory store runs in the browser and this module
 * answers every request locally with identical response shapes.
 */

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!IS_STATIC) return fetch(path, init);
  return Promise.resolve(handleLocally(path, init));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function parseBody<T>(init?: RequestInit): T {
  try {
    return JSON.parse((init?.body as string) ?? "{}") as T;
  } catch {
    return {} as T;
  }
}

function handleLocally(path: string, init?: RequestInit): Response {
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://local.demo");
  const p = url.pathname;
  const s = getStore();

  // ---- auth ----
  if (p === "/api/auth" && method === "POST") {
    const body = parseBody<{ username?: string }>(init);
    const user = s.users.find((u) => u.username === body.username);
    if (!user) return json({ error: "invalid credentials" }, 401);
    user.isOnline = true;
    user.status = "online";
    return json({ user });
  }

  // ---- users ----
  if (p === "/api/users" || p === "/api/admin/users") {
    if (method === "PATCH") {
      const body = parseBody<{ userId?: string; action?: "suspend" | "activate" }>(init);
      const user = s.users.find((u) => u.id === body.userId);
      if (!user) return json({ error: "not found" }, 404);
      user.isSuspended = body.action === "suspend";
      if (user.isSuspended) {
        user.isOnline = false;
        user.status = "offline";
      }
      return json({ user });
    }
    return json({ users: s.users });
  }

  // ---- chats ----
  if (p === "/api/chats" && method === "GET") {
    const userId = url.searchParams.get("userId");
    const chats = userId ? s.chats.filter((c) => c.memberIds.includes(userId)) : s.chats;
    const sorted = [...chats].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
    });
    return json({ chats: sorted });
  }
  if (p === "/api/chats" && method === "POST") {
    const body = parseBody<{ name?: string; type?: Chat["type"]; memberIds?: string[]; creatorId?: string }>(init);
    if (!body.creatorId || !Array.isArray(body.memberIds)) return json({ error: "bad request" }, 400);
    const memberIds = Array.from(new Set([body.creatorId, ...body.memberIds]));
    const type = body.type ?? (memberIds.length > 2 ? "group" : "private");
    const chat: Chat = {
      id: `c-${Date.now().toString(36)}`,
      name: type === "private" ? null : (body.name ?? "گروه جدید"),
      type,
      avatar: null,
      isPinned: false,
      memberIds,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    };
    s.chats.unshift(chat);
    return json({ chat }, 201);
  }

  const msgMatch = p.match(/^\/api\/chats\/([^/]+)\/messages$/);
  if (msgMatch) {
    const chatId = msgMatch[1];
    if (method === "GET") {
      const messages = s.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return json({ messages });
    }
    if (method === "POST") {
      const body = parseBody<{ senderId?: string; content?: string; type?: MessageType; replyToId?: string | null }>(init);
      const chat = s.chats.find((c) => c.id === chatId);
      if (!chat || !body.senderId || !body.content?.trim()) return json({ error: "bad request" }, 400);
      const message: Message = {
        id: `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
        chatId,
        senderId: body.senderId,
        content: body.content.trim(),
        type: body.type ?? "text",
        replyToId: body.replyToId ?? null,
        forwardedFrom: null,
        isRead: false,
        isPinned: false,
        reactions: [],
        createdAt: new Date().toISOString(),
      };
      s.messages.push(message);
      chat.lastMessage = message.content;
      chat.lastMessageAt = message.createdAt;
      return json({ message }, 201);
    }
    if (method === "PATCH") {
      const body = parseBody<{ messageId?: string; action?: string; emoji?: string; userId?: string }>(init);
      const msg = s.messages.find((m) => m.id === body.messageId && m.chatId === chatId);
      if (!msg) return json({ error: "not found" }, 404);
      if (body.action === "pin") msg.isPinned = true;
      if (body.action === "unpin") msg.isPinned = false;
      if (body.action === "read") msg.isRead = true;
      if (body.action === "react" && body.emoji && body.userId) {
        const existing = msg.reactions.find((r) => r.emoji === body.emoji);
        if (existing) {
          if (existing.userIds.includes(body.userId)) {
            existing.userIds = existing.userIds.filter((u) => u !== body.userId);
            if (existing.userIds.length === 0) msg.reactions = msg.reactions.filter((r) => r !== existing);
          } else {
            existing.userIds.push(body.userId);
          }
        } else {
          msg.reactions.push({ emoji: body.emoji, userIds: [body.userId] });
        }
      }
      return json({ message: msg });
    }
  }

  // ---- calls ----
  if (p === "/api/calls") {
    if (method === "POST") {
      const body = parseBody<{ type?: Call["type"]; initiatorId?: string; peerId?: string }>(init);
      if (!body.initiatorId || !body.peerId) return json({ error: "bad request" }, 400);
      const call: Call = {
        id: `call-${Date.now().toString(36)}`,
        type: body.type ?? "audio",
        status: "active",
        direction: "outgoing",
        initiatorId: body.initiatorId,
        peerId: body.peerId,
        duration: null,
        createdAt: new Date().toISOString(),
      };
      s.calls.unshift(call);
      return json({ call }, 201);
    }
    if (method === "PATCH") {
      const body = parseBody<{ callId?: string; duration?: number }>(init);
      const call = s.calls.find((c) => c.id === body.callId);
      if (!call) return json({ error: "not found" }, 404);
      call.status = "ended";
      call.duration = body.duration ?? 0;
      return json({ call });
    }
    const userId = url.searchParams.get("userId");
    const calls = userId ? s.calls.filter((c) => c.initiatorId === userId || c.peerId === userId) : s.calls;
    return json({ calls: [...calls].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }

  // ---- meetings ----
  const meetingMatch = p.match(/^\/api\/meetings\/([^/]+)$/);
  if (meetingMatch) {
    const meeting = s.meetings.find((m) => m.id === meetingMatch[1] || m.link === meetingMatch[1]);
    if (!meeting) return json({ error: "not found" }, 404);
    if (method === "PATCH") {
      const body = parseBody<{ action?: string; userId?: string }>(init);
      switch (body.action) {
        case "join":
          if (body.userId && !meeting.participantIds.includes(body.userId)) meeting.participantIds.push(body.userId);
          if (meeting.status === "scheduled") meeting.status = "active";
          break;
        case "leave":
          if (body.userId) meeting.participantIds = meeting.participantIds.filter((x) => x !== body.userId);
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
    }
    return json({ meeting });
  }
  if (p === "/api/meetings") {
    if (method === "POST") {
      const body = parseBody<{ title?: string; type?: Meeting["type"]; hostId?: string; maxParticipants?: number }>(init);
      if (!body.title?.trim() || !body.hostId) return json({ error: "bad request" }, 400);
      const meeting: Meeting = {
        id: `mt-${Date.now().toString(36)}`,
        title: body.title.trim(),
        type: body.type ?? "meeting",
        link: `meet-${Math.random().toString(36).slice(2, 7)}`,
        status: "active",
        hostId: body.hostId,
        maxParticipants: body.maxParticipants ?? 100,
        isRecording: false,
        participantIds: [body.hostId],
        startsAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      s.meetings.unshift(meeting);
      return json({ meeting }, 201);
    }
    const type = url.searchParams.get("type");
    const meetings = type ? s.meetings.filter((m) => m.type === type) : s.meetings;
    return json({ meetings: [...meetings].sort((a, b) => b.startsAt.localeCompare(a.startsAt)) });
  }

  // ---- classes ----
  if (p === "/api/classes") {
    if (method === "POST") {
      const body = parseBody<{ title?: string; teacherId?: string }>(init);
      if (!body.title?.trim() || !body.teacherId) return json({ error: "bad request" }, 400);
      const cls = {
        id: `cl-${Date.now().toString(36)}`,
        title: body.title.trim(),
        teacherId: body.teacherId,
        status: "active" as const,
        studentIds: [],
        attendance: {},
        startsAt: new Date().toISOString(),
      };
      s.classes.unshift(cls);
      return json({ class: cls }, 201);
    }
    if (method === "PATCH") {
      const body = parseBody<{ classId?: string; action?: string; userId?: string; present?: boolean }>(init);
      const cls = s.classes.find((c) => c.id === body.classId);
      if (!cls) return json({ error: "not found" }, 404);
      if (body.action === "join" && body.userId) {
        if (!cls.studentIds.includes(body.userId) && body.userId !== cls.teacherId) cls.studentIds.push(body.userId);
        cls.attendance[body.userId] = true;
        if (cls.status === "scheduled") cls.status = "active";
      }
      if (body.action === "leave" && body.userId) cls.attendance[body.userId] = false;
      if (body.action === "attendance" && body.userId !== undefined) cls.attendance[body.userId] = body.present ?? false;
      if (body.action === "end") cls.status = "ended";
      return json({ class: cls });
    }
    return json({ classes: s.classes });
  }

  // ---- admin ----
  if (p === "/api/admin/stats") return json({ stats: computeStats() });
  if (p === "/api/admin/server") {
    return json({
      metrics: {
        cpu: 18 + Math.round(Math.random() * 20),
        memory: 42 + Math.round(Math.random() * 15),
        memoryTotal: 8,
        uptime: Math.round(performance.now() / 1000),
        version: "1.0.0",
        platform: "static demo",
        nodeVersion: "browser",
      },
    });
  }

  // ---- ai ----
  if (p === "/api/ai" && method === "POST") {
    const body = parseBody<{ mode?: AiMode; meetingTitle?: string; transcript?: string; topic?: string; locale?: string }>(init);
    if (!body.mode) return json({ error: "bad request" }, 400);
    const input = (body.mode === "brainstorm" ? body.topic : body.transcript) ?? "";
    return json({ result: demoAiOutput(body.mode, body.meetingTitle ?? "جلسه آسامیت", input, body.locale ?? "fa"), demo: true });
  }

  return json({ error: "not found" }, 404);
}

/** Excel/CSV export — server route normally; generated client-side in the static demo. */
export function openExport(kind: string) {
  if (!IS_STATIC) {
    window.open(`/api/admin/export?kind=${kind}`, "_blank");
    return;
  }
  const s = getStore();
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  let rows: string[][] = [["username", "displayName", "role"]];
  if (kind === "sample") {
    rows.push(["newuser1", "کاربر نمونه یک", "user"]);
  } else if (kind === "meetings") {
    rows = [["title", "type", "status"], ...s.meetings.map((m) => [m.title, m.type, m.status])];
  } else if (kind === "classes") {
    rows = [["title", "status"], ...s.classes.map((c) => [c.title, c.status])];
  } else {
    rows = [
      ["username", "displayName", "role", "status"],
      ...s.users.map((u) => [u.username, u.displayName, u.role as Role, u.isSuspended ? "suspended" : u.status]),
    ];
  }
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `asameet-${kind}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
