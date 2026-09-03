import type { Chat, Message, User } from "@/lib/types";

export function lastSeenLabel(user: User | undefined, t: (k: string) => string, locale: string): string {
  if (!user) return "";
  if (user.isOnline) return t("common.online");
  const d = new Date(user.lastSeen);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t("talk.status.justNow");
  if (diff < 3600) return `${t("talk.status.lastSeen")} ${Math.floor(diff / 60)} ${t("talk.status.minAgo")}`;
  if (diff < 86400) return `${t("talk.status.lastSeen")} ${Math.floor(diff / 3600)} ${t("talk.status.hourAgo")}`;
  return `${t("talk.status.lastSeen")} ${new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale, { month: "short", day: "numeric" }).format(d)}`;
}

export function messagePreview(m: Pick<Message, "type" | "content" | "meta">, t: (k: string) => string): string {
  switch (m.type) {
    case "image":
      return `🖼 ${m.content || t("talk.msg.photo")}`;
    case "file":
      return `📎 ${m.meta?.fileName ?? t("talk.msg.file")}`;
    case "voice":
      return `🎤 ${t("talk.msg.voice")}`;
    case "video":
      return `🎬 ${m.content || t("talk.msg.video")}`;
    case "video_note":
      return `📹 ${t("talk.msg.videoNote")}`;
    case "sticker":
      return `${t("talk.msg.sticker")}`;
    case "call":
      return `📞 ${t("talk.msg.call")}`;
    case "system":
      return systemText(m.content, undefined, t);
    default:
      return m.content;
  }
}

export function systemText(code: string, who: string | undefined, t: (k: string) => string): string {
  const key = `talk.system.${code}`;
  const text = t(key);
  if (text === key) return code;
  return who ? `${who} ${text}` : text;
}

export function chatDisplayName(chat: Chat, users: Map<string, User>, myId: string, t: (k: string) => string): string {
  if (chat.type !== "private") return chat.name ?? "—";
  if (chat.memberIds.length === 1 && chat.memberIds[0] === myId) return t("talk.savedMessages");
  const peer = chat.memberIds.find((m) => m !== myId);
  return (peer && users.get(peer)?.displayName) || t("talk.deletedAccount");
}

export function isSavedChat(chat: Chat, myId: string): boolean {
  return chat.type === "private" && chat.memberIds.length === 1 && chat.memberIds[0] === myId;
}

export function peerOf(chat: Chat, myId: string): string | null {
  if (chat.type !== "private") return null;
  return chat.memberIds.find((m) => m !== myId) ?? null;
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(iso: string, locale: string, today: string, yesterday: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= start) return today;
  if (d >= new Date(start.getTime() - 86400000)) return yesterday;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale, {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(d);
}

const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
export function splitLinks(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    const raw = m[0];
    out.push({ text: raw, href: raw.startsWith("http") ? raw : `https://${raw}` });
    last = i + raw.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Web";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /Chrome\//i.test(ua)
      ? "Chrome"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Safari\//i.test(ua)
          ? "Safari"
          : "Browser";
  return `${browser} · ${os}`;
}
