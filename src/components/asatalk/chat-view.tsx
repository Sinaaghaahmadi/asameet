"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  BellOff,
  Forward,
  MoreVertical,
  Palette,
  Phone,
  Pin,
  Search,
  Trash2,
  Video,
  X,
  Eraser,
  LogOut,
  Ban,
  Pencil,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { talkApi } from "@/lib/talk/api";
import { blobToBase64 } from "@/lib/talk/media";
import {
  chatDisplayName,
  dayKey,
  dayLabel,
  isSavedChat,
  lastSeenLabel,
  peerOf,
} from "@/lib/talk/format";
import { playSent } from "@/lib/talk/sounds";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import type { Chat, Message } from "@/lib/types";
import { ACCENTS, useTalkStore } from "@/stores/talk-store";
import { useCalls } from "./calls/call-provider";
import { Composer, type OutgoingMessage } from "./composer";
import { ConfirmDialog, ForwardPicker } from "./dialogs";
import { ChatThemeSheet } from "./chat-theme";
import {
  GBtn,
  GEmpty,
  GHeader,
  GMenu,
  GMenuContent,
  GMenuItem,
  GMenuSeparator,
  GMenuTrigger,
  GSearch,
  TalkAvatar,
} from "./glass";
import { Mascot } from "./mascots";
import { MessageBubble, type BubbleActions } from "./message-bubble";
import { useTalk } from "./talk-data";

export function ChatView({
  chat,
  onBack,
  onOpenInfo,
}: {
  chat: Chat;
  onBack: () => void;
  onOpenInfo: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const qc = useQueryClient();
  const {
    me,
    users,
    showError,
    refreshChats,
    isBlocked,
    toggleBlock,
    openPrivateChat,
  } = useTalk();
  const { startCall } = useCalls();
  const {
    replyTo,
    editing,
    setReplyTo,
    setEditing,
    selected,
    toggleSelected,
    clearSelected,
    settings,
    openChat,
  } = useTalkStore();
  const [search, setSearch] = useState<string | null>(null);
  const [forward, setForward] = useState<Message[] | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    danger?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [themeSheet, setThemeSheet] = useState(false);
  const chatTheme = settings.chatThemes?.[chat.id];
  const themeAccent = chatTheme?.accent ? ACCENTS[chatTheme.accent] : null;
  const listRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<string | null>(null);

  const saved = isSavedChat(chat, me.id);
  const peerId = peerOf(chat, me.id);
  const peer = peerId ? users.get(peerId) : undefined;
  const title = chatDisplayName(chat, users, me.id, t);
  const canPost =
    chat.type !== "channel" ||
    chat.myRole === "owner" ||
    chat.myRole === "admin" ||
    me.role === "admin";
  const canPin = chat.type !== "channel" || canPost;
  const blocked = peerId ? isBlocked(peerId) : false;

  const msgsQ = useQuery({
    queryKey: ["talk", "messages", chat.id],
    queryFn: () => talkApi.messages(chat.id),
    refetchInterval: 2500,
  });
  const messages = useMemo(() => msgsQ.data?.messages ?? [], [msgsQ.data]);
  const byId = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );
  const pinned = useMemo(() => messages.filter((m) => m.isPinned), [messages]);
  const [pinIdx, setPinIdx] = useState(0);

  // Unread marker position captured once per chat open.
  useEffect(() => {
    firstUnreadRef.current = null;
    setAtBottom(true);
  }, [chat.id]);
  useEffect(() => {
    if (
      firstUnreadRef.current === null &&
      messages.length &&
      chat.unreadCount > 0
    ) {
      const first = messages[Math.max(0, messages.length - chat.unreadCount)];
      firstUnreadRef.current = first?.id ?? "";
    }
  }, [messages, chat.unreadCount]);

  // Mark read when new messages arrive while open.
  const lastAt = messages.length
    ? messages[messages.length - 1].createdAt
    : null;
  useEffect(() => {
    if (!lastAt || chat.unreadCount === 0) return;
    void talkApi.markRead(chat.id).then(() => refreshChats());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, lastAt, chat.unreadCount]);

  // Keep scrolled to the bottom when we are there.
  const prevCount = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevCount.current === 0 || atBottom) el.scrollTop = el.scrollHeight;
    prevCount.current = messages.length;
  }, [messages.length, atBottom, chat.id]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["talk", "messages", chat.id] });
    void refreshChats();
  }, [qc, chat.id, refreshChats]);

  const send = useCallback(
    async (out: OutgoingMessage) => {
      try {
        let mediaId: string | null = null;
        if (out.blob) {
          const b64 = await blobToBase64(out.blob);
          mediaId = (
            await talkApi.uploadMedia(chat.id, out.mime ?? out.blob.type, b64)
          ).id;
        }
        await talkApi.send(chat.id, {
          content: out.content,
          type: out.type,
          replyToId: replyTo,
          mediaId,
          meta: out.meta,
        });
        setReplyTo(null);
        if (settings.inAppSounds) playSent();
        invalidate();
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
          }),
        );
      } catch (e) {
        showError(e);
      }
    },
    [chat.id, replyTo, setReplyTo, invalidate, showError, settings.inAppSounds],
  );

  const act = useCallback(
    async (body: Parameters<typeof talkApi.messageAction>[1]) => {
      try {
        await talkApi.messageAction(chat.id, body);
        invalidate();
      } catch (e) {
        showError(e);
      }
    },
    [chat.id, invalidate, showError],
  );

  const jumpTo = useCallback((id: string) => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${id}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.animate(
      [
        { background: "oklch(0.62 0.16 var(--talk-h) / 0.25)" },
        { background: "transparent" },
      ],
      { duration: 1400 },
    );
  }, []);

  const actions: BubbleActions = useMemo(
    () => ({
      reply: (m) => setReplyTo(m.id),
      edit: (m) => setEditing(m.id),
      forward: (m) => setForward([m]),
      react: (m, emoji) =>
        void act({ messageId: m.id, action: "react", emoji }),
      pin: (m) =>
        void act({ messageId: m.id, action: m.isPinned ? "unpin" : "pin" }),
      remove: (m) =>
        setConfirm({
          title: t("talk.msg.deleteConfirm"),
          danger: true,
          action: () => act({ messageId: m.id, action: "delete" }),
        }),
      select: (m) => toggleSelected(m.id),
      jumpTo,
      vote: (m, option) =>
        void act({ messageId: m.id, action: "vote", text: String(option) }),
      openContact: (userId) => void openPrivateChat(userId).catch(showError),
    }),
    [
      act,
      setReplyTo,
      setEditing,
      toggleSelected,
      jumpTo,
      t,
      openPrivateChat,
      showError,
    ],
  );

  const typingNames = (chat.typingUserIds ?? [])
    .map((id) => users.get(id)?.displayName)
    .filter(Boolean) as string[];
  const subtitle = typingNames.length
    ? typingNames.length === 1
      ? chat.type === "private"
        ? t("talk.list.typing")
        : `${typingNames[0]} ${t("talk.list.typing")}`
      : t("talk.list.typingMany")
    : saved
      ? t("talk.savedMessages")
      : chat.type === "private"
        ? lastSeenLabel(peer, t, locale)
        : `${toLocaleDigits(chat.memberIds.length, locale)} ${t(chat.type === "channel" ? "talk.chat.subscribers" : "talk.chat.members")}${
            chat.type === "group"
              ? `, ${toLocaleDigits(chat.memberIds.filter((id) => users.get(id)?.isOnline).length, locale)} ${t("talk.chat.online")}`
              : ""
          }`;

  const filtered = search
    ? messages.filter(
        (m) =>
          m.type !== "system" &&
          m.content.toLowerCase().includes(search.toLowerCase()),
      )
    : messages;

  return (
    <section
      className="tg-wall flex h-full min-w-0 flex-1 flex-col"
      data-wall={chatTheme?.wallpaper ?? settings.wallpaper}
      style={
        themeAccent
          ? {
              ["--talk-h" as string]: themeAccent.h,
              ["--talk-c" as string]: themeAccent.c,
            }
          : undefined
      }
      aria-label={title}
    >
      {/* ---------- header ---------- */}
      {selected.length > 0 ? (
        <GHeader
          title={`${toLocaleDigits(selected.length, locale)} ${t("talk.chat.selectedCount")}`}
          left={
            <GBtn
              variant="ghost"
              size="icon"
              onClick={clearSelected}
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </GBtn>
          }
          right={
            <>
              <GBtn
                variant="ghost"
                size="icon"
                aria-label={t("talk.msg.forward")}
                onClick={() =>
                  setForward(
                    selected.map((id) => byId.get(id)!).filter(Boolean),
                  )
                }
              >
                <Forward className="size-5" />
              </GBtn>
              <GBtn
                variant="ghost"
                size="icon"
                aria-label={t("talk.msg.delete")}
                onClick={() =>
                  setConfirm({
                    title: t("talk.msg.deleteConfirm"),
                    danger: true,
                    action: async () => {
                      for (const id of selected)
                        await talkApi
                          .messageAction(chat.id, {
                            messageId: id,
                            action: "delete",
                          })
                          .catch(() => undefined);
                      clearSelected();
                      invalidate();
                    },
                  })
                }
              >
                <Trash2 className="size-5 text-red-500" />
              </GBtn>
            </>
          }
        />
      ) : search !== null ? (
        <header className="tg-panel tg-safe-top z-chrome tg-line flex h-14 shrink-0 items-center gap-2 border-b px-2">
          <div className="flex-1">
            <GSearch
              value={search}
              onChange={setSearch}
              placeholder={t("talk.chat.searchInChat")}
              autoFocus
              icon={<Search />}
            />
          </div>
          <GBtn
            variant="ghost"
            size="icon"
            onClick={() => setSearch(null)}
            aria-label={t("common.close")}
          >
            <X className="size-5" />
          </GBtn>
        </header>
      ) : (
        <GHeader
          onBack={onBack}
          className="md:[&>button:first-child]:hidden"
          left={
            <button
              type="button"
              onClick={onOpenInfo}
              className="flex min-w-0 items-center gap-2.5 text-start"
              aria-label={t("talk.chat.info")}
            >
              <TalkAvatar
                name={title}
                src={
                  saved
                    ? null
                    : chat.type === "private"
                      ? peer?.avatar
                      : chat.avatar
                }
                size="md"
                online={peer?.isOnline}
                icon={saved ? <span className="text-lg">🔖</span> : undefined}
                seed={chat.id}
              />
            </button>
          }
          title={
            <button
              type="button"
              onClick={onOpenInfo}
              className="text-name max-w-full truncate text-start font-extrabold"
            >
              {title}
              {chat.isMuted && (
                <BellOff className="ms-1 inline size-3 opacity-60" />
              )}
            </button>
          }
          subtitle={
            typingNames.length ? (
              <span className="text-label text-talk">
                {subtitle} <span className="tg-typing-dot" />{" "}
                <span
                  className="tg-typing-dot"
                  style={{ animationDelay: "0.15s" }}
                />{" "}
                <span
                  className="tg-typing-dot"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
            ) : (
              <span className={cn("text-label", peer?.isOnline && "text-talk")}>
                {subtitle}
              </span>
            )
          }
          right={
            <>
              {peer && !saved && (
                <>
                  <GBtn
                    variant="ghost"
                    size="icon"
                    onClick={() => void startCall(peer, "audio")}
                    aria-label={t("talk.chat.call")}
                  >
                    <Phone className="size-5" />
                  </GBtn>
                  <GBtn
                    variant="ghost"
                    size="icon"
                    onClick={() => void startCall(peer, "video")}
                    aria-label={t("talk.chat.videoCall")}
                  >
                    <Video className="size-5" />
                  </GBtn>
                </>
              )}
              <GBtn
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                aria-label={t("talk.chat.searchInChat")}
                className="hidden sm:inline-flex"
              >
                <Search className="size-5" />
              </GBtn>
              <GMenu>
                <GMenuTrigger asChild>
                  <GBtn variant="ghost" size="icon" aria-label="menu">
                    <MoreVertical className="size-5" />
                  </GBtn>
                </GMenuTrigger>
                <GMenuContent align="end">
                  <GMenuItem onSelect={onOpenInfo}>
                    <Pencil /> {t("talk.chat.info")}
                  </GMenuItem>
                  <GMenuItem onSelect={() => setSearch("")}>
                    <Search /> {t("talk.chat.searchInChat")}
                  </GMenuItem>
                  <GMenuItem
                    onSelect={() =>
                      void talkApi
                        .chatPrefs(chat.id, { muted: !chat.isMuted })
                        .then(refreshChats)
                    }
                  >
                    <BellOff />{" "}
                    {chat.isMuted ? t("talk.chat.unmute") : t("talk.chat.mute")}
                  </GMenuItem>
                  <GMenuItem
                    onSelect={() =>
                      void talkApi
                        .chatPrefs(chat.id, { pinned: !chat.isPinned })
                        .then(refreshChats)
                    }
                  >
                    <Pin />{" "}
                    {chat.isPinned ? t("talk.chat.unpin") : t("talk.chat.pin")}
                  </GMenuItem>
                  <GMenuItem onSelect={() => setThemeSheet(true)}>
                    <Palette /> {t("talk.conv.chatTheme")}
                  </GMenuItem>
                  {peerId && !saved && (
                    <GMenuItem onSelect={() => void toggleBlock(peerId)}>
                      <Ban />{" "}
                      {blocked ? t("talk.chat.unblock") : t("talk.chat.block")}
                    </GMenuItem>
                  )}
                  <GMenuSeparator />
                  {chat.type !== "private" && (
                    <GMenuItem
                      danger
                      onSelect={() =>
                        setConfirm({
                          title: t("talk.chat.leaveConfirm"),
                          danger: true,
                          action: async () => {
                            await talkApi.chatMembers(chat.id, "leave");
                            openChat(null);
                            await refreshChats();
                          },
                        })
                      }
                    >
                      <LogOut /> {t("talk.chat.leave")}
                    </GMenuItem>
                  )}
                  {(chat.type === "private" ||
                    chat.myRole === "owner" ||
                    chat.myRole === "admin") && (
                    <GMenuItem
                      danger
                      onSelect={() =>
                        setConfirm({
                          title:
                            chat.type === "private"
                              ? t("talk.chat.deleteConfirm")
                              : t("talk.chat.clearConfirm"),
                          danger: true,
                          action: async () => {
                            await talkApi.deleteChat(chat.id);
                            if (chat.type === "private") openChat(null);
                            invalidate();
                          },
                        })
                      }
                    >
                      {chat.type === "private" ? <Trash2 /> : <Eraser />}{" "}
                      {chat.type === "private"
                        ? t("talk.chat.delete")
                        : t("talk.chat.clearHistory")}
                    </GMenuItem>
                  )}
                </GMenuContent>
              </GMenu>
            </>
          }
        />
      )}

      {/* ---------- pinned bar ---------- */}
      {pinned.length > 0 && !search && (
        <button
          type="button"
          className="tg-panel z-chrome tg-line flex h-11 items-center gap-2.5 border-b px-3 text-start text-xs"
          onClick={() => {
            const m = pinned[pinIdx % pinned.length];
            jumpTo(m.id);
            setPinIdx((i) => i + 1);
          }}
        >
          <span className="tg-pin-bars">
            {pinned.slice(0, 3).map((m, i) => (
              <span
                key={m.id}
                data-dim={i !== pinIdx % Math.min(3, pinned.length)}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-label text-talk block font-bold">
              {pinned.length > 1
                ? t("talk.conv.pinnedOf")
                    .replace(
                      "{i}",
                      toLocaleDigits((pinIdx % pinned.length) + 1, locale),
                    )
                    .replace("{n}", toLocaleDigits(pinned.length, locale))
                : t("talk.chat.pinnedMessage")}
            </span>
            <span className="tg-muted block truncate text-[12px]">
              {pinned[pinIdx % pinned.length].content ||
                t(
                  `talk.msg.${pinned[pinIdx % pinned.length].type === "image" ? "photo" : pinned[pinIdx % pinned.length].type}`,
                )}
            </span>
          </span>
          {canPin ? (
            <span
              role="button"
              className="tg-btn tg-btn-ghost tg-icon !h-8 !w-8"
              aria-label={t("talk.msg.unpin")}
              onClick={(e) => {
                e.stopPropagation();
                void act({
                  messageId: pinned[pinIdx % pinned.length].id,
                  action: "unpin",
                });
              }}
            >
              <X className="size-4" />
            </span>
          ) : (
            <Pin className="size-4 rotate-45 opacity-50" />
          )}
        </button>
      )}

      {/* ---------- messages ---------- */}
      <div
        ref={listRef}
        className="tg-scroll relative flex-1 px-1 py-3 md:px-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        }}
      >
        {msgsQ.isLoading && (
          <p className="tg-muted p-8 text-center text-sm">
            {t("common.loading")}
          </p>
        )}
        {!msgsQ.isLoading && filtered.length === 0 && (
          <GEmpty
            mascot={<Mascot pose={search ? "search" : "wave"} size={150} />}
            title={
              search ? t("talk.list.noResults") : t("talk.chat.noMessages")
            }
            desc={search ? undefined : t("talk.chat.noMessagesDesc")}
          />
        )}
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {filtered.map((m, i) => {
            const prev = filtered[i - 1];
            const next = filtered[i + 1];
            const newDay =
              !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const sameNext =
              next &&
              next.senderId === m.senderId &&
              next.type !== "system" &&
              new Date(next.createdAt).getTime() -
                new Date(m.createdAt).getTime() <
                5 * 60_000;
            const samePrev =
              prev &&
              prev.senderId === m.senderId &&
              prev.type !== "system" &&
              !newDay &&
              new Date(m.createdAt).getTime() -
                new Date(prev.createdAt).getTime() <
                5 * 60_000;
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="z-chrome sticky top-1 my-2 flex justify-center">
                    <span className="tg-date-chip">
                      {dayLabel(
                        m.createdAt,
                        locale,
                        t("common.today"),
                        t("common.yesterday"),
                      )}
                    </span>
                  </div>
                )}
                {firstUnreadRef.current === m.id && m.senderId !== me.id && (
                  <div className="text-caption text-talk my-2 flex items-center gap-2 font-bold">
                    <span className="bg-talk/40 h-px flex-1" />
                    {t("talk.chat.unreadMessages")}
                    <span className="bg-talk/40 h-px flex-1" />
                  </div>
                )}
                <MessageBubble
                  msg={m}
                  chat={chat}
                  me={me}
                  users={users}
                  repliedTo={
                    m.replyToId ? (byId.get(m.replyToId) ?? null) : null
                  }
                  showSender={!samePrev}
                  tail={!sameNext}
                  selected={selected.includes(m.id)}
                  actions={actions}
                  canPin={canPin}
                  seenBy={
                    chat.type === "group" &&
                    m.senderId === me.id &&
                    i === filtered.length - 1
                      ? chat.readCount
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              className="tg-btn tg-icon z-chrome sticky bottom-2 ms-1 me-auto !h-11 !w-11 !rounded-full"
              onClick={() =>
                listRef.current?.scrollTo({
                  top: listRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
              aria-label={t("talk.chat.jumpToBottom")}
            >
              <ArrowDown className="size-5" />
              {chat.unreadCount > 0 && (
                <span className="tg-badge absolute start-1/2 -top-2 -translate-x-1/2 rtl:translate-x-1/2">
                  {toLocaleDigits(chat.unreadCount, locale)}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- composer ---------- */}
      {blocked ? (
        <div className="tg-panel tg-line flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="tg-muted">{t("talk.chat.blocked")}</span>
          <GBtn size="sm" onClick={() => peerId && void toggleBlock(peerId)}>
            {t("talk.chat.unblock")}
          </GBtn>
        </div>
      ) : !canPost ? (
        <div className="tg-safe-bottom flex items-center gap-3 px-3 pt-1 pb-3">
          <div className="tg-composer text-body flex h-12 flex-1 items-center justify-center px-4">
            <span className="tg-muted">{t("talk.chat.broadcast")}</span>
          </div>
          <GBtn
            className="text-body h-12 !rounded-full px-4"
            onClick={() =>
              void talkApi
                .chatPrefs(chat.id, { muted: !chat.isMuted })
                .then(refreshChats)
            }
          >
            {chat.isMuted ? (
              <Bell className="size-4" />
            ) : (
              <BellOff className="size-4" />
            )}{" "}
            {chat.isMuted ? t("talk.conv.unmute") : t("talk.conv.mute")}
          </GBtn>
        </div>
      ) : (
        <Composer
          chatId={chat.id}
          replyTo={replyTo ? (byId.get(replyTo) ?? null) : null}
          editing={editing ? (byId.get(editing) ?? null) : null}
          users={users}
          onSend={send}
          onEdit={async (id, text) =>
            act({ messageId: id, action: "edit", text })
          }
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
          onTyping={() => void talkApi.typing(chat.id).catch(() => undefined)}
          chatType={chat.type}
        />
      )}

      {themeSheet && (
        <ChatThemeSheet chatId={chat.id} onClose={() => setThemeSheet(false)} />
      )}
      {forward && (
        <ForwardPicker
          messages={forward}
          onClose={() => setForward(null)}
          onDone={async (targetId) => {
            for (const m of forward)
              await talkApi
                .messageAction(chat.id, {
                  messageId: m.id,
                  action: "forward",
                  targetChatId: targetId,
                })
                .catch(showError);
            toast.success(t("talk.msg.forwarded"));
            clearSelected();
            setForward(null);
            await refreshChats();
            openChat(targetId);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await confirm.action();
            } catch (e) {
              showError(e);
            }
            setConfirm(null);
          }}
        />
      )}
    </section>
  );
}
