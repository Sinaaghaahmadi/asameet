"use client";

/**
 * Typed client for the Asatalk API surface. Every call goes through the
 * same-origin /api routes; the session is the httpOnly cookie.
 */
import { apiFetch } from "@/lib/client-api";
import type {
  Call,
  Chat,
  ChatPreview,
  DeviceSession,
  Message,
  MessageMeta,
  MessageType,
  User,
} from "@/lib/types";

export class TalkApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new TalkApiError(data.error ?? "server_error", res.status);
  return data;
}

const post = <T>(path: string, body?: unknown, method = "POST") =>
  json<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export interface TalkSettings {
  theme?: "light" | "dark" | "system";
  accent?: string;
  wallpaper?: string;
  bubbleRadius?: number;
  fontSize?: number;
  animations?: boolean;
  sendOnEnter?: boolean;
  notifSound?: boolean;
  notifPreview?: boolean;
  notifPrivate?: boolean;
  notifGroups?: boolean;
  notifChannels?: boolean;
  inAppSounds?: boolean;
  lastSeen?: "everybody" | "contacts" | "nobody";
  profilePhoto?: "everybody" | "contacts" | "nobody";
  callsPrivacy?: "everybody" | "contacts" | "nobody";
  forwards?: "everybody" | "contacts" | "nobody";
  groupsPrivacy?: "everybody" | "contacts" | "nobody";
  blocked?: string[];
  pinLock?: string;
  chatThemes?: Record<string, { accent?: string; wallpaper?: string }>;
  onboarded?: boolean;
  autoDownloadPhotos?: boolean;
  autoDownloadVideos?: boolean;
  autoDownloadFiles?: boolean;
  saveToGallery?: boolean;
  folders?: { id: string; name: string; emoji: string; chatIds: string[] }[];
  [key: string]: unknown;
}

export const talkApi = {
  me: () => json<{ user: User; settings: TalkSettings }>("/api/auth"),
  login: (username: string, password: string) =>
    post<{ user: User }>("/api/auth", { username, password }),
  signup: (username: string, password: string, displayName: string) =>
    post<{ user: User }>("/api/auth", {
      mode: "signup",
      username,
      password,
      displayName,
    }),
  otpRequest: (identifier: string) =>
    post<{
      kind: "phone" | "email";
      known: boolean;
      demoCode?: string;
      ttl: number;
    }>("/api/auth/otp", { identifier }),
  otpVerify: (identifier: string, code: string, displayName?: string) =>
    post<{ user: User; isNew: boolean }>("/api/auth/otp", {
      identifier,
      code,
      displayName,
    }),
  logoutCurrent: () =>
    post<{ user: User | null }>("/api/auth?keep=1", undefined, "DELETE"),
  logoutAll: () =>
    post<{ user: User | null }>("/api/auth", undefined, "DELETE"),
  accounts: () =>
    json<{ accounts: { user: User; current: boolean }[] }>(
      "/api/auth/accounts",
    ),
  switchAccount: (userId: string) =>
    post<{ user: User; settings: TalkSettings }>("/api/auth/switch", {
      userId,
    }),
  changePassword: (current: string, next: string) =>
    post<object>("/api/auth/password", { current, next }),
  sessions: () => json<{ sessions: DeviceSession[] }>("/api/auth/sessions"),
  terminateSession: (id?: string) =>
    post<object>(
      `/api/auth/sessions${id ? `?id=${encodeURIComponent(id)}` : ""}`,
      undefined,
      "DELETE",
    ),

  updateProfile: (body: {
    displayName?: string;
    username?: string;
    bio?: string;
    avatar?: string;
    clearAvatar?: boolean;
    note?: string;
    clearNote?: boolean;
  }) => post<{ user: User }>("/api/profile", body, "PATCH"),
  updateSettings: (patch: TalkSettings) =>
    post<{ settings: TalkSettings }>("/api/settings", patch, "PATCH"),

  users: () => json<{ users: User[] }>("/api/users"),
  chats: () => json<{ chats: Chat[] }>("/api/chats"),
  createChat: (body: {
    type: Chat["type"];
    name?: string;
    memberIds: string[];
    description?: string;
    avatar?: string;
  }) => post<{ chat: Chat }>("/api/chats", body),
  savedChat: () => post<{ chat: Chat }>("/api/chats/saved"),
  updateChat: (
    id: string,
    body: {
      name?: string;
      description?: string;
      username?: string;
      avatar?: string;
      clearAvatar?: boolean;
      resetInvite?: boolean;
    },
  ) => post<{ chat: Chat }>(`/api/chats/${id}`, body, "PATCH"),
  deleteChat: (id: string) =>
    post<object>(`/api/chats/${id}`, undefined, "DELETE"),
  chatMembers: (
    id: string,
    action: "add" | "remove" | "promote" | "demote" | "leave" | "delete",
    userId?: string,
  ) => post<{ chat?: Chat }>(`/api/chats/${id}/members`, { action, userId }),
  chatPrefs: (
    id: string,
    prefs: { pinned?: boolean; muted?: boolean; archived?: boolean },
  ) => post<object>(`/api/chats/${id}/prefs`, prefs),
  typing: (id: string) => post<object>(`/api/chats/${id}/typing`),
  join: (ref: string) => post<{ chat: Chat }>("/api/chats/join", { ref }),
  previewJoin: (ref: string) =>
    post<{ preview: ChatPreview }>("/api/chats/join", { ref, preview: true }),

  messages: (chatId: string) =>
    json<{ messages: Message[] }>(`/api/chats/${chatId}/messages`),
  send: (
    chatId: string,
    body: {
      content: string;
      type?: MessageType;
      replyToId?: string | null;
      mediaId?: string | null;
      meta?: MessageMeta;
    },
  ) => post<{ message: Message }>(`/api/chats/${chatId}/messages`, body),
  messageAction: (
    chatId: string,
    body: {
      messageId: string;
      action:
        | "pin"
        | "unpin"
        | "read"
        | "react"
        | "edit"
        | "delete"
        | "forward"
        | "vote";
      emoji?: string;
      text?: string;
      targetChatId?: string;
    },
  ) =>
    post<{ message?: Message }>(`/api/chats/${chatId}/messages`, body, "PATCH"),
  markRead: (chatId: string) => post<object>(`/api/chats/${chatId}/read`),
  search: (q: string, chatId?: string) =>
    json<{ messages: Message[] }>(
      `/api/search?q=${encodeURIComponent(q)}${chatId ? `&chatId=${chatId}` : ""}`,
    ),

  uploadMedia: (chatId: string, mime: string, base64: string) =>
    post<{ id: string }>("/api/media", { chatId, mime, data: base64 }),

  calls: () => json<{ calls: Call[] }>("/api/calls"),
  startCall: (peerId: string, type: "audio" | "video") =>
    post<{ call: Call }>("/api/calls", { peerId, type }),
  endCall: (callId: string, duration: number) =>
    post<{ call: Call }>("/api/calls", { callId, duration }, "PATCH"),
  answerCall: (callId: string, action: "accept" | "decline") =>
    post<{ call: Call }>(`/api/calls/${callId}`, { action }),
  signal: (callId: string, payload: unknown) =>
    post<object>(`/api/calls/${callId}`, { action: "signal", payload }),
  pollCall: (callId: string, after: number) =>
    json<{ call: Call; signals: { id: number; payload: SignalPayload }[] }>(
      `/api/calls/${callId}?after=${after}`,
    ),
  incomingCall: () => json<{ call: Call | null }>("/api/calls/incoming"),
};

export type SignalPayload =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "state"; muted?: boolean; camera?: boolean; screen?: boolean }
  | { kind: "restart" }
  | { kind: "bye" };

export function mediaUrl(mediaId: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/media/${mediaId}`;
}
