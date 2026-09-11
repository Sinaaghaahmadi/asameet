import type { Chat, Message, User } from "./types";
import { t, locale } from "./i18n";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function digits(v: string | number): string {
  const s = String(v);
  return locale() === "fa" ? s.replace(/\d/g, (d) => FA_DIGITS[+d]) : s;
}
export function formatTime(iso: string): string {
  return digits(new Intl.DateTimeFormat(locale() === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)));
}
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function relativeDay(iso: string): string {
  const d = new Date(iso), now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= start) return formatTime(iso);
  if (d >= new Date(start.getTime() - 86400000)) return t("common.yesterday");
  return digits(new Intl.DateTimeFormat(locale() === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" }).format(d));
}
export function dayKey(iso: string): string {
  const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
export function dayLabel(iso: string): string {
  const d = new Date(iso), now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= start) return t("common.today");
  if (d >= new Date(start.getTime() - 86400000)) return t("common.yesterday");
  return digits(new Intl.DateTimeFormat(locale() === "fa" ? "fa-IR" : "en-US", { month: "long", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined }).format(d));
}
export function lastSeenLabel(user: User | undefined): string {
  if (!user) return "";
  if (user.isOnline) return t("common.online");
  const diff = (Date.now() - new Date(user.lastSeen).getTime()) / 1000;
  if (diff < 60) return t("status.justNow");
  if (diff < 3600) return `${t("status.lastSeen")} ${digits(Math.floor(diff / 60))} ${t("status.minAgo")}`;
  if (diff < 86400) return `${t("status.lastSeen")} ${digits(Math.floor(diff / 3600))} ${t("status.hourAgo")}`;
  return `${t("status.lastSeen")} ${relativeDay(user.lastSeen)}`;
}
export function messagePreview(m: Pick<Message, "type" | "content" | "meta">): string {
  switch (m.type) {
    case "image": return `🖼 ${m.content || t("msg.photo")}`;
    case "file": return `📎 ${m.meta?.fileName ?? t("msg.file")}`;
    case "voice": return `🎤 ${t("msg.voice")}`;
    case "video": return `🎬 ${m.content || t("msg.video")}`;
    case "video_note": return `📹 ${t("msg.videoNote")}`;
    case "sticker": return t("msg.sticker");
    case "call": return `📞 ${t("msg.call")}`;
    case "poll": return `📊 ${m.content || t("msg.poll")}`;
    case "location": return `📍 ${t("msg.location")}`;
    case "contact": return `👤 ${m.content || t("msg.contact")}`;
    case "system": return m.content;
    default: return m.content;
  }
}
export function chatDisplayName(chat: Chat, users: Map<string, User>, myId: string): string {
  if (chat.type !== "private") return chat.name ?? "—";
  if (chat.memberIds.length === 1 && chat.memberIds[0] === myId) return t("savedMessages");
  const peer = chat.memberIds.find((m) => m !== myId);
  return (peer && users.get(peer)?.displayName) || t("deletedAccount");
}
export const isSavedChat = (chat: Chat, myId: string) =>
  chat.type === "private" && chat.memberIds.length === 1 && chat.memberIds[0] === myId;
export const peerOf = (chat: Chat, myId: string) =>
  chat.type === "private" ? (chat.memberIds.find((m) => m !== myId) ?? null) : null;
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}
export function hueOf(seed: string): number {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0; return h % 360;
}
