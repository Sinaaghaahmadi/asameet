/**
 * Typed client for the Asatalk API. Same routes as the web app; the session
 * cookie is kept by the native cookie jar (iOS NSHTTPCookieStorage /
 * Android CookieManager), so nothing about auth changes on the server.
 */
import type {
  Call, Chat, ChatPreview, DeviceSession, Message, MessageMeta, MessageType, User,
} from "./types";

export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://asameet.vercel.app").replace(/\/$/, "");

export class TalkApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new TalkApiError("network", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new TalkApiError(data.error ?? "server_error", res.status);
  return data;
}
const post = <T,>(path: string, body?: unknown, method = "POST") =>
  json<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface TalkSettings {
  theme?: "light" | "dark" | "system"; accent?: string; wallpaper?: string;
  fontSize?: number; notifSound?: boolean; notifPreview?: boolean;
  notifPrivate?: boolean; notifGroups?: boolean; notifChannels?: boolean;
  inAppSounds?: boolean; blocked?: string[]; onboarded?: boolean;
  [key: string]: unknown;
}

export type SignalPayload =
  | { kind: "offer"; sdp: string } | { kind: "answer"; sdp: string }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "state"; muted?: boolean; camera?: boolean; screen?: boolean }
  | { kind: "restart" } | { kind: "bye" };

export const talkApi = {
  me: () => json<{ user: User; settings: TalkSettings }>("/api/auth"),
  login: (username: string, password: string) => post<{ user: User }>("/api/auth", { username, password }),
  otpRequest: (identifier: string) =>
    post<{ kind: "phone" | "email"; known: boolean; demoCode?: string; ttl: number }>("/api/auth/otp", { identifier }),
  otpVerify: (identifier: string, code: string, displayName?: string) =>
    post<{ user: User; isNew: boolean }>("/api/auth/otp", { identifier, code, displayName }),
  logoutCurrent: () => post<{ user: User | null }>("/api/auth?keep=1", undefined, "DELETE"),
  logoutAll: () => post<{ user: User | null }>("/api/auth", undefined, "DELETE"),
  accounts: () => json<{ accounts: { user: User; current: boolean }[] }>("/api/auth/accounts"),
  switchAccount: (userId: string) => post<{ user: User; settings: TalkSettings }>("/api/auth/switch", { userId }),
  sessions: () => json<{ sessions: DeviceSession[] }>("/api/auth/sessions"),
  terminateSession: (id?: string) =>
    post<object>(`/api/auth/sessions${id ? `?id=${encodeURIComponent(id)}` : ""}`, undefined, "DELETE"),
  updateProfile: (body: { displayName?: string; username?: string; bio?: string; avatar?: string; clearAvatar?: boolean; note?: string; clearNote?: boolean }) =>
    post<{ user: User }>("/api/profile", body, "PATCH"),
  updateSettings: (patch: TalkSettings) => post<{ settings: TalkSettings }>("/api/settings", patch, "PATCH"),

  users: () => json<{ users: User[] }>("/api/users"),
  chats: () => json<{ chats: Chat[] }>("/api/chats"),
  createChat: (body: { type: Chat["type"]; name?: string; memberIds: string[]; description?: string }) =>
    post<{ chat: Chat }>("/api/chats", body),
  savedChat: () => post<{ chat: Chat }>("/api/chats/saved"),
  deleteChat: (id: string) => post<object>(`/api/chats/${id}`, undefined, "DELETE"),
  chatMembers: (id: string, action: "add" | "remove" | "promote" | "demote" | "leave" | "delete", userId?: string) =>
    post<{ chat?: Chat }>(`/api/chats/${id}/members`, { action, userId }),
  chatPrefs: (id: string, prefs: { pinned?: boolean; muted?: boolean; archived?: boolean }) =>
    post<object>(`/api/chats/${id}/prefs`, prefs),
  typing: (id: string) => post<object>(`/api/chats/${id}/typing`),
  join: (ref: string) => post<{ chat: Chat }>("/api/chats/join", { ref }),
  previewJoin: (ref: string) => post<{ preview: ChatPreview }>("/api/chats/join", { ref, preview: true }),

  messages: (chatId: string) => json<{ messages: Message[] }>(`/api/chats/${chatId}/messages`),
  send: (chatId: string, body: { content: string; type?: MessageType; replyToId?: string | null; mediaId?: string | null; meta?: MessageMeta; chatTitle?: string }) =>
    post<{ message: Message }>(`/api/chats/${chatId}/messages`, body),
  messageAction: (chatId: string, body: { messageId: string; action: "pin" | "unpin" | "read" | "react" | "edit" | "delete" | "forward" | "vote"; emoji?: string; text?: string; targetChatId?: string }) =>
    post<{ message?: Message }>(`/api/chats/${chatId}/messages`, body, "PATCH"),
  markRead: (chatId: string) => post<object>(`/api/chats/${chatId}/read`),
  search: (q: string, chatId?: string) =>
    json<{ messages: Message[] }>(`/api/search?q=${encodeURIComponent(q)}${chatId ? `&chatId=${chatId}` : ""}`),
  uploadMedia: (chatId: string, mime: string, base64: string) =>
    post<{ id: string }>("/api/media", { chatId, mime, data: base64 }),

  calls: () => json<{ calls: Call[] }>("/api/calls"),
  startCall: (peerId: string, type: "audio" | "video", title?: string) => post<{ call: Call }>("/api/calls", { peerId, type, title }),
  startGroupCall: (chatId: string, type: "audio" | "video", title?: string) => post<{ call: Call }>("/api/calls", { chatId, type, title }),
  endCall: (callId: string, duration: number) => post<{ call: Call }>("/api/calls", { callId, duration }, "PATCH"),
  leaveCall: (callId: string) => post<{ call: Call }>(`/api/calls/${callId}`, { action: "leave" }),
  answerCall: (callId: string, action: "accept" | "decline") => post<{ call: Call }>(`/api/calls/${callId}`, { action }),
  callPresence: (callId: string, state: { muted?: boolean; camera?: boolean }) =>
    post<object>(`/api/calls/${callId}`, { action: "presence", ...state }),
  signal: (callId: string, payload: unknown, to?: string | null) =>
    post<object>(`/api/calls/${callId}`, { action: "signal", payload, to }),
  pollCall: (callId: string, after: number) =>
    json<{ call: Call; signals: { id: number; from: string; payload: SignalPayload }[] }>(`/api/calls/${callId}?after=${after}`),
  incomingCall: () => json<{ call: Call | null }>("/api/calls/incoming"),

  qrPeek: (code: string) => post<{ userAgent: string; createdAt: string }>("/api/auth/qr", { action: "peek", code }),
  qrApprove: (code: string, approve: boolean) =>
    post<{ status: string }>("/api/auth/qr", { action: approve ? "approve" : "reject", code }),

  presence: (state: "online" | "offline") => post<object>(`/api/presence?state=${state}`),
  /** Native push: the Expo token travels as an `expo:` endpoint. */
  pushSubscribe: (expoToken: string) =>
    post<object>("/api/push", { endpoint: `expo:${expoToken}`, keys: { p256dh: "-", auth: "-" } }),
  pushUnsubscribe: (expoToken: string) => post<object>("/api/push", { endpoint: `expo:${expoToken}` }, "DELETE"),
};

export const mediaUrl = (mediaId: string) => `${BASE_URL}/api/media/${mediaId}`;
