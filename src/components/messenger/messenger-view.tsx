"use client";

import { apiFetch } from "@/lib/client-api";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  MessageSquarePlus,
  Mic,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  SmilePlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/lib/i18n";
import type { Chat, Message, User } from "@/lib/types";
import { cn, formatRelativeDay, formatTime } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

type ChatFilter = "all" | "unread" | "groups" | "channels";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "🙏"];

export function MessengerView() {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser, setUnreadCount } = useAppStore();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<ChatFilter>("all");
  const [search, setSearch] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [draft, setDraft] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Presence and chat-list updates arrive by polling; the interval doubles as
  // the heartbeat that keeps this user marked online.
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiFetch("/api/users")).json() as Promise<{ users: User[] }>,
    refetchInterval: 30000,
  });
  const users = useMemo(() => new Map((usersData?.users ?? []).map((u) => [u.id, u])), [usersData]);

  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => (await apiFetch("/api/chats")).json() as Promise<{ chats: Chat[] }>,
    enabled: !!currentUser,
    refetchInterval: 5000,
  });
  const chats = useMemo(() => chatsData?.chats ?? [], [chatsData]);

  const { data: messagesData } = useQuery({
    queryKey: ["messages", activeChatId],
    queryFn: async () =>
      (await apiFetch(`/api/chats/${activeChatId}/messages`)).json() as Promise<{ messages: Message[] }>,
    enabled: !!activeChatId,
    refetchInterval: 3000,
  });
  const messages = useMemo(() => messagesData?.messages ?? [], [messagesData]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    const total = chats.reduce((sum, c) => sum + c.unreadCount, 0);
    setUnreadCount("chats", total);
  }, [chats, setUnreadCount]);

  // A chat can reference someone who signed up after our last users fetch —
  // refresh the directory as soon as an unknown member shows up.
  useEffect(() => {
    if (!usersData) return;
    const known = new Set(usersData.users.map((u) => u.id));
    if (chats.some((c) => c.memberIds.some((id) => !known.has(id)))) {
      void qc.invalidateQueries({ queryKey: ["users"] });
    }
  }, [chats, usersData, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Reading is real now: opening a chat (or receiving messages while it is
  // open) clears its unread counter for this member on the server.
  const lastMessageAt = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;
    void apiFetch(`/api/chats/${activeChatId}/read`, { method: "POST" }).then(() => {
      void qc.invalidateQueries({ queryKey: ["chats"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, lastMessageAt]);

  const sendMessage = useMutation({
    mutationFn: async (payload: { content: string; replyToId: string | null }) => {
      const res = await apiFetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("send failed");
      return res.json() as Promise<{ message: Message }>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["messages", activeChatId] });
      void qc.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const messageAction = useMutation({
    mutationFn: async (payload: { messageId: string; action: string; emoji?: string }) => {
      await apiFetch(`/api/chats/${activeChatId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["messages", activeChatId] }),
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          type: "group",
          memberIds: groupMembers,
        }),
      });
      return res.json() as Promise<{ chat: Chat }>;
    },
    onSuccess: (data) => {
      setShowNewGroup(false);
      setGroupName("");
      setGroupMembers([]);
      void qc.invalidateQueries({ queryKey: ["chats"] });
      setActiveChatId(data.chat.id);
      toast.success(t("messenger.groupCreated"));
    },
  });

  const startChat = useMutation({
    mutationFn: async (peerId: string) => {
      const res = await apiFetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "private", memberIds: [peerId] }),
      });
      if (!res.ok) throw new Error("chat failed");
      return res.json() as Promise<{ chat: Chat }>;
    },
    onSuccess: (data) => {
      setShowNewChat(false);
      void qc.invalidateQueries({ queryKey: ["chats"] });
      setActiveChatId(data.chat.id);
    },
    onError: () => toast.error(t("common.error")),
  });

  if (!currentUser) return null;

  function chatTitle(chat: Chat): string {
    if (chat.name) return chat.name;
    const peerId = chat.memberIds.find((m) => m !== currentUser?.id);
    return (peerId && users.get(peerId)?.displayName) || "—";
  }

  function chatOnline(chat: Chat): boolean {
    if (chat.type !== "private") return false;
    const peerId = chat.memberIds.find((m) => m !== currentUser?.id);
    return (peerId && users.get(peerId)?.isOnline) || false;
  }

  const filteredChats = chats.filter((c) => {
    if (filter === "unread" && c.unreadCount === 0) return false;
    if (filter === "groups" && c.type !== "group") return false;
    if (filter === "channels" && c.type !== "channel") return false;
    if (search && !chatTitle(c).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinnedMessage = messages.find((m) => m.isPinned);

  function handleSend() {
    const content = draft.trim();
    if (!content || !activeChatId) return;
    setDraft("");
    const reply = replyTo;
    setReplyTo(null);
    sendMessage.mutate({ content, replyToId: reply?.id ?? null });
  }

  const filters: { key: ChatFilter; label: string }[] = [
    { key: "all", label: t("messenger.filters.all") },
    { key: "unread", label: t("messenger.filters.unread") },
    { key: "groups", label: t("messenger.filters.groups") },
    { key: "channels", label: t("messenger.filters.channels") },
  ];

  return (
    <div className="flex h-full">
      {/* ============ Chat list ============ */}
      <section
        className={cn(
          "flex w-full shrink-0 flex-col border-e border-border bg-card/40 md:w-[340px]",
          activeChatId && "hidden md:flex"
        )}
        aria-label={t("messenger.title")}
      >
        <header className="space-y-3 p-4 pb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black">{t("messenger.title")}</h1>
            <div className="flex items-center gap-1.5">
              <Button size="iconSm" variant="glass" onClick={() => setShowNewChat(true)} aria-label={t("messenger.newChat")}>
                <MessageSquarePlus className="size-4" />
              </Button>
              <Button size="iconSm" variant="glass" onClick={() => setShowNewGroup(true)} aria-label={t("messenger.newGroup")}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("messenger.searchChats")}
              className="ps-9"
              aria-label={t("messenger.searchChats")}
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  filter === f.key
                    ? "bg-gradient-to-l from-teal-500 to-emerald-600 text-white shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredChats.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          )}
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={cn(
                "slide-in flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition-colors cursor-pointer",
                activeChatId === chat.id ? "bg-gradient-to-l from-teal-500/15 to-emerald-500/10" : "hover:bg-accent/60"
              )}
            >
              <Avatar name={chatTitle(chat)} size="lg" online={chat.type === "private" ? chatOnline(chat) : undefined} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {chat.type === "group" && <Users className="size-3.5 shrink-0 text-muted-foreground" />}
                  {chat.type === "channel" && <span className="text-xs text-muted-foreground">📢</span>}
                  <span className="truncate text-sm font-bold">{chatTitle(chat)}</span>
                  {chat.isPinned && <Pin className="size-3 shrink-0 rotate-45 text-muted-foreground" />}
                  {chat.lastMessageAt && (
                    <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                      {formatRelativeDay(chat.lastMessageAt, locale, t("common.today"), t("common.yesterday"))}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-xs text-muted-foreground">{chat.lastMessage ?? t("messenger.noMessages")}</span>
                  {chat.unreadCount > 0 && (
                    <span className="ms-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 px-1.5 text-[10px] font-bold text-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ Message panel ============ */}
      <section className={cn("chat-bg flex min-w-0 flex-1 flex-col", !activeChatId && "hidden md:flex")} aria-label={activeChat ? chatTitle(activeChat) : ""}>
        {!activeChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="icon-3d-wrap size-20 animate-float">
              <Send className="size-9 text-primary" />
            </span>
            <h2 className="text-lg font-bold">{t("messenger.selectChat")}</h2>
            <p className="max-w-xs text-sm text-muted-foreground">{t("messenger.selectChatDesc")}</p>
          </div>
        ) : (
          <>
            <header className="glass-nav z-10 flex items-center gap-3 px-4 py-2.5">
              <Button variant="ghost" size="iconSm" className="md:hidden" onClick={() => setActiveChatId(null)} aria-label={t("common.back")}>
                <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
              </Button>
              <Avatar name={chatTitle(activeChat)} online={activeChat.type === "private" ? chatOnline(activeChat) : undefined} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold">{chatTitle(activeChat)}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeChat.type === "private"
                    ? chatOnline(activeChat)
                      ? t("common.online")
                      : t("common.offline")
                    : `${activeChat.memberIds.length} ${t("messenger.members")}`}
                </p>
              </div>
            </header>

            {pinnedMessage && (
              <div className="glass-subtle flex items-center gap-2 border-b border-border/50 px-4 py-2 text-xs">
                <Pin className="size-3.5 shrink-0 rotate-45 text-primary" />
                <span className="font-semibold text-primary">{t("messenger.pinnedMessage")}:</span>
                <span className="truncate text-muted-foreground">{pinnedMessage.content}</span>
                <button
                  onClick={() => messageAction.mutate({ messageId: pinnedMessage.id, action: "unpin" })}
                  className="ms-auto cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={t("messenger.unpin")}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("messenger.noMessages")}</p>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  if (msg.type === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center py-1">
                        <Badge variant="secondary" className="glass-subtle text-[11px] font-normal text-muted-foreground">
                          {msg.content}
                        </Badge>
                      </div>
                    );
                  }
                  const own = msg.senderId === currentUser.id;
                  const sender = users.get(msg.senderId);
                  const repliedTo = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      className={cn("group flex items-end gap-2", own ? "justify-end" : "justify-start")}
                    >
                      {!own && <Avatar name={sender?.displayName ?? "?"} size="sm" className="mb-0.5" />}
                      <div className={cn("relative", own ? "msg-bubble-own" : "msg-bubble-other")}>
                        {!own && activeChat.type !== "private" && (
                          <p className="mb-0.5 text-[11px] font-bold text-primary">{sender?.displayName}</p>
                        )}
                        {repliedTo && (
                          <div
                            className={cn(
                              "mb-1.5 rounded-lg border-s-2 px-2 py-1 text-[11px]",
                              own ? "border-white/60 bg-white/15" : "border-primary/60 bg-primary/8"
                            )}
                          >
                            <p className="font-bold">{users.get(repliedTo.senderId)?.displayName}</p>
                            <p className="line-clamp-1 opacity-80">{repliedTo.content}</p>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", own ? "opacity-80" : "opacity-50")}>
                          {formatTime(msg.createdAt, locale)}
                          {own &&
                            (msg.isRead ? (
                              <CheckCheck className="size-3.5 text-sky-300" aria-label={t("messenger.read")} />
                            ) : (
                              <Check className="size-3.5" aria-label={t("messenger.sent")} />
                            ))}
                        </span>
                        {msg.reactions.length > 0 && (
                          <span className="absolute -bottom-3 start-2 flex gap-0.5">
                            {msg.reactions.map((r) => (
                              <button
                                key={r.emoji}
                                onClick={() => messageAction.mutate({ messageId: msg.id, action: "react", emoji: r.emoji })}
                                className="glass-strong flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] shadow cursor-pointer"
                              >
                                {r.emoji} {r.userIds.length > 1 && r.userIds.length}
                              </button>
                            ))}
                          </span>
                        )}
                        {/* Hover actions */}
                        <span
                          className={cn(
                            "absolute top-0 hidden gap-0.5 group-hover:flex",
                            own ? "-start-24 flex-row-reverse" : "-end-24"
                          )}
                        >
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="glass-strong rounded-lg p-1.5 text-muted-foreground shadow hover:text-primary cursor-pointer"
                            aria-label={t("messenger.reply")}
                          >
                            <CornerUpLeft className="size-3.5" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="glass-strong rounded-lg p-1.5 text-muted-foreground shadow hover:text-primary cursor-pointer"
                                aria-label={t("ai.title")}
                              >
                                <SmilePlus className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="flex gap-1 px-1 py-0.5">
                                {REACTION_EMOJIS.map((e) => (
                                  <button
                                    key={e}
                                    onClick={() => messageAction.mutate({ messageId: msg.id, action: "react", emoji: e })}
                                    className="rounded-lg p-1 text-lg transition-transform hover:scale-125 cursor-pointer"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  void navigator.clipboard.writeText(msg.content);
                                  toast.success(t("common.copied"));
                                }}
                              >
                                <Copy /> {t("messenger.copyText")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => messageAction.mutate({ messageId: msg.id, action: msg.isPinned ? "unpin" : "pin" })}
                              >
                                <Pin /> {msg.isPinned ? t("messenger.unpin") : t("messenger.pin")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="glass-subtle flex items-center gap-2 border-t border-border/50 px-4 py-2 text-xs">
                <CornerUpLeft className="size-3.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">{users.get(replyTo.senderId)?.displayName}</p>
                  <p className="truncate text-muted-foreground">{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
                  <X className="size-4" />
                </button>
              </div>
            )}

            {/* Composer */}
            <footer className="glass-nav safe-area-bottom border-t-0 px-3 py-2.5">
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <Button type="button" variant="ghost" size="iconSm" aria-label={t("messenger.attachFile")} onClick={() => toast.info(t("messenger.attachFile"))}>
                  <Paperclip className="size-5 text-muted-foreground" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("messenger.typeMessage")}
                  className="flex-1 rounded-2xl border-none bg-card/80"
                  aria-label={t("messenger.typeMessage")}
                />
                {draft.trim() ? (
                  <Button type="submit" size="icon" className="rounded-full" aria-label={t("common.send")}>
                    <Send className="size-5 rtl:-scale-x-100" />
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" size="iconSm" aria-label={t("messenger.voiceMessage")} onClick={() => toast.info(t("messenger.voiceMessage"))}>
                    <Mic className="size-5 text-muted-foreground" />
                  </Button>
                )}
              </form>
            </footer>
          </>
        )}
      </section>

      {/* ============ New chat dialog ============ */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="size-5 text-primary" /> {t("messenger.newChat")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {(usersData?.users ?? [])
              .filter((u) => u.id !== currentUser.id && !u.isSuspended)
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChat.mutate(u.id)}
                  disabled={startChat.isPending}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-start hover:bg-accent disabled:opacity-60"
                >
                  <Avatar name={u.displayName} size="sm" online={u.isOnline} />
                  <span className="min-w-0 flex-1 truncate text-sm">{u.displayName}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">@{u.username}</span>
                </button>
              ))}
            {(usersData?.users ?? []).filter((u) => u.id !== currentUser.id).length === 0 && (
              <p className="p-3 text-center text-sm text-muted-foreground">{t("messenger.noOtherUsers")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ New group dialog ============ */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" /> {t("messenger.newGroup")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("messenger.groupNamePlaceholder")}
            aria-label={t("messenger.groupNamePlaceholder")}
          />
          <p className="text-sm font-semibold">{t("messenger.selectMembers")}</p>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {(usersData?.users ?? [])
              .filter((u) => u.id !== currentUser.id)
              .map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={groupMembers.includes(u.id)}
                    onChange={(e) =>
                      setGroupMembers((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))
                    }
                    className="size-4 accent-teal-600"
                  />
                  <Avatar name={u.displayName} size="sm" online={u.isOnline} />
                  <span className="text-sm">{u.displayName}</span>
                </label>
              ))}
          </div>
          <Button
            disabled={!groupName.trim() || groupMembers.length === 0 || createGroup.isPending}
            onClick={() => createGroup.mutate()}
          >
            {t("messenger.create")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
