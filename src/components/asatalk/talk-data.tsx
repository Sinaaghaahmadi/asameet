"use client";

/**
 * Data layer for Asatalk: users directory, chat list, current user, settings.
 * Polling keeps everything fresh (the platform API is request/response); the
 * intervals double as the presence heartbeat.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { talkApi, TalkApiError, type TalkSettings } from "@/lib/talk/api";
import { playIncomingMessage } from "@/lib/talk/sounds";
import { messagePreview } from "@/lib/talk/format";
import { useT } from "@/lib/i18n";
import type { Chat, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";

interface TalkData {
  me: User;
  users: Map<string, User>;
  userList: User[];
  chats: Chat[];
  loading: boolean;
  chatById: (id: string) => Chat | undefined;
  refreshChats: () => Promise<unknown>;
  refreshUsers: () => Promise<unknown>;
  saveSettings: (patch: TalkSettings) => Promise<void>;
  isBlocked: (userId: string) => boolean;
  toggleBlock: (userId: string) => Promise<void>;
  openPrivateChat: (userId: string) => Promise<Chat>;
  openSaved: () => Promise<Chat>;
  showError: (e: unknown) => void;
}

const Ctx = createContext<TalkData | null>(null);

export function useTalk(): TalkData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTalk outside TalkDataProvider");
  return ctx;
}

export function TalkDataProvider({ me, children }: { me: User; children: React.ReactNode }) {
  const qc = useQueryClient();
  const t = useT();
  const { settings, patchSettings, openChat, activeChatId } = useTalkStore();

  const usersQ = useQuery({
    queryKey: ["talk", "users"],
    queryFn: () => talkApi.users(),
    refetchInterval: 30_000,
  });
  const chatsQ = useQuery({
    queryKey: ["talk", "chats"],
    queryFn: () => talkApi.chats(),
    refetchInterval: 4_000,
  });

  const users = useMemo(() => new Map((usersQ.data?.users ?? []).map((u) => [u.id, u])), [usersQ.data]);
  const chats = useMemo(() => chatsQ.data?.chats ?? [], [chatsQ.data]);

  // Directory refresh when a chat references someone we have not loaded yet.
  useEffect(() => {
    if (!usersQ.data) return;
    if (chats.some((c) => c.memberIds.some((id) => !users.has(id)))) void usersQ.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, usersQ.data]);

  // Incoming-message sound + browser notification: compare last message ids.
  const seen = useRef<Map<string, string>>(new Map());
  const primed = useRef(false);
  useEffect(() => {
    if (!chatsQ.data) return;
    const next = new Map<string, string>();
    for (const c of chats) {
      const key = `${c.lastMessageAt ?? ""}:${c.lastMessageSenderId ?? ""}`;
      next.set(c.id, key);
      const prev = seen.current.get(c.id);
      const fresh = primed.current && prev !== undefined && prev !== key && c.lastMessageSenderId && c.lastMessageSenderId !== me.id;
      if (!fresh || c.isMuted) continue;
      const allowed = c.type === "private" ? settings.notifPrivate : c.type === "group" ? settings.notifGroups : settings.notifChannels;
      if (!allowed) continue;
      if (settings.notifSound) playIncomingMessage();
      const hidden = typeof document !== "undefined" && (document.hidden || activeChatId !== c.id);
      if (hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const sender = users.get(c.lastMessageSenderId ?? "")?.displayName ?? "";
        const title = c.type === "private" ? sender : `${c.name ?? ""}`;
        const body = settings.notifPreview
          ? `${c.type !== "private" && sender ? `${sender}: ` : ""}${messagePreview({ type: c.lastMessageType ?? "text", content: c.lastMessage ?? "", meta: {} }, t)}`
          : t("talk.name");
        try {
          const n = new Notification(title || t("talk.name"), { body, tag: c.id, icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/asatalk/icons/icon-192.png` });
          n.onclick = () => {
            window.focus();
            openChat(c.id);
            n.close();
          };
        } catch {
          /* notifications unsupported */
        }
      }
    }
    seen.current = next;
    primed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatsQ.data]);

  const showError = useCallback(
    (e: unknown) => {
      const code = e instanceof TalkApiError ? e.code : "generic";
      const key = `talk.errors.${code}`;
      const msg = t(key);
      toast.error(msg === key ? t("talk.errors.generic") : msg);
    },
    [t]
  );

  const saveSettings = useCallback(
    async (patch: TalkSettings) => {
      patchSettings(patch);
      try {
        await talkApi.updateSettings(patch);
      } catch (e) {
        showError(e);
      }
    },
    [patchSettings, showError]
  );

  const isBlocked = useCallback((userId: string) => (settings.blocked ?? []).includes(userId), [settings.blocked]);
  const toggleBlock = useCallback(
    async (userId: string) => {
      const list = settings.blocked ?? [];
      await saveSettings({ blocked: list.includes(userId) ? list.filter((x) => x !== userId) : [...list, userId] });
    },
    [saveSettings, settings.blocked]
  );

  const openPrivateChat = useCallback(
    async (userId: string) => {
      const { chat } = await talkApi.createChat({ type: "private", memberIds: [userId] });
      await qc.invalidateQueries({ queryKey: ["talk", "chats"] });
      openChat(chat.id);
      return chat;
    },
    [openChat, qc]
  );

  const openSaved = useCallback(async () => {
    const { chat } = await talkApi.savedChat();
    await qc.invalidateQueries({ queryKey: ["talk", "chats"] });
    openChat(chat.id);
    return chat;
  }, [openChat, qc]);

  const value = useMemo<TalkData>(
    () => ({
      me,
      users,
      userList: usersQ.data?.users ?? [],
      chats,
      loading: chatsQ.isLoading,
      chatById: (id) => chats.find((c) => c.id === id),
      refreshChats: () => qc.invalidateQueries({ queryKey: ["talk", "chats"] }),
      refreshUsers: () => qc.invalidateQueries({ queryKey: ["talk", "users"] }),
      saveSettings,
      isBlocked,
      toggleBlock,
      openPrivateChat,
      openSaved,
      showError,
    }),
    [me, users, usersQ.data, chats, chatsQ.isLoading, qc, saveSettings, isBlocked, toggleBlock, openPrivateChat, openSaved, showError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
