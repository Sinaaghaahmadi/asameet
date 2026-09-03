"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import Link from "next/link";
import { BellOff, Bookmark, Check, CheckCheck, Link2, LogOut, Megaphone, Menu, Moon, Pencil, Phone, Pin, PinOff, Plus, Search, Settings, Sun, Trash2, UserPlus, Users, Video, X, Eye } from "lucide-react";
import { talkApi } from "@/lib/talk/api";
import { chatDisplayName, isSavedChat, messagePreview, peerOf } from "@/lib/talk/format";
import { useLocale, useT } from "@/lib/i18n";
import { cn, formatRelativeDay, toLocaleDigits } from "@/lib/utils";
import type { Chat } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { JoinDialog } from "./dialogs";
import { AsatalkLogo } from "./mascots";
import { GBtn, GMenu, GMenuContent, GMenuItem, GMenuSeparator, GMenuTrigger, GSearch, TalkAvatar } from "./glass";
import { Mascot } from "./mascots";
import { useTalk } from "./talk-data";

export function ChatList({ onLogout, onAddAccount, onSwitch }: { onLogout: () => void; onAddAccount: () => void; onSwitch: (userId: string) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me, users, chats, refreshChats, openSaved, showError } = useTalk();
  const { activeChatId, openChat, folder, setFolder, setPanel, drawerOpen, setDrawer, settings, accounts, drafts } = useTalkStore();
  const [q, setQ] = useState("");
  const [join, setJoin] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const folders = useMemo(() => {
    const base = [
      { id: "all", label: t("talk.folders.all") },
      { id: "personal", label: t("talk.folders.personal") },
      { id: "groups", label: t("talk.folders.groups") },
      { id: "channels", label: t("talk.folders.channels") },
      { id: "unread", label: t("talk.folders.unread") },
    ];
    return [...base, ...(settings.folders ?? []).map((f) => ({ id: `f:${f.id}`, label: `${f.emoji} ${f.name}` }))];
  }, [settings.folders, t]);

  const list = useMemo(() => {
    const custom = folder.startsWith("f:") ? settings.folders?.find((f) => `f:${f.id}` === folder) : null;
    return chats.filter((c) => {
      if (folder === "personal" && c.type !== "private") return false;
      if (folder === "groups" && c.type !== "group") return false;
      if (folder === "channels" && c.type !== "channel") return false;
      if (folder === "unread" && c.unreadCount === 0) return false;
      if (custom && !custom.chatIds.includes(c.id)) return false;
      if (q) {
        const title = chatDisplayName(c, users, me.id, t).toLowerCase();
        const peer = peerOf(c, me.id);
        const uname = peer ? users.get(peer)?.username ?? "" : c.username ?? "";
        return title.includes(q.toLowerCase()) || uname.includes(q.toLowerCase().replace("@", ""));
      }
      return true;
    });
  }, [chats, folder, q, settings.folders, users, me.id, t]);

  const unreadTotal = chats.reduce((s, c) => s + (c.isMuted ? 0 : c.unreadCount), 0);
  const peopleHits = q
    ? Array.from(users.values()).filter((u) => u.id !== me.id && (u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase().replace("@", "")))).slice(0, 5)
    : [];

  return (
    <section className="tg-panel relative flex h-full w-full flex-col md:border-e md:tg-line" aria-label={t("talk.list.chats")}>
      {/* ---------- top bar ---------- */}
      <div className="tg-safe-top flex items-center gap-2 px-2 pt-2 pb-1">
        <GBtn variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="menu" className="relative">
          <Menu className="size-5" />
          {unreadTotal > 0 && <span className="tg-badge absolute -end-0.5 -top-0.5 !h-4 !min-w-4 !text-[9px]">{toLocaleDigits(unreadTotal > 99 ? "99+" : unreadTotal, locale)}</span>}
        </GBtn>
        <div className="flex-1">
          <GSearch value={q} onChange={setQ} placeholder={t("talk.list.search")} icon={<Search />} />
        </div>
        {q && (
          <GBtn variant="ghost" size="icon" onClick={() => setQ("")} aria-label={t("common.close")}>
            <X className="size-5" />
          </GBtn>
        )}
      </div>

      {/* ---------- folders ---------- */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-1.5">
        {folders.map((f) => {
          const unread = f.id === "all" ? 0 : chats.filter((c) => (f.id === "personal" ? c.type === "private" : f.id === "groups" ? c.type === "group" : f.id === "channels" ? c.type === "channel" : f.id === "unread" ? true : settings.folders?.find((x) => `f:${x.id}` === f.id)?.chatIds.includes(c.id))).reduce((s, c) => s + (c.isMuted ? 0 : c.unreadCount), 0);
          return (
            <button key={f.id} type="button" className="tg-chip" data-active={folder === f.id} onClick={() => setFolder(f.id)}>
              {f.label}
              {unread > 0 && <span className={cn("tg-badge !h-4 !min-w-4 !text-[9px]", folder === f.id && "!bg-white !text-[var(--talk-strong)]")}>{toLocaleDigits(unread, locale)}</span>}
            </button>
          );
        })}
      </div>

      {/* ---------- list ---------- */}
      <div className="tg-scroll flex-1 px-1.5 pb-20">
        {peopleHits.length > 0 && (
          <>
            <p className="tg-section-title">{t("talk.list.people")}</p>
            {peopleHits.map((u) => (
              <button key={u.id} type="button" className="tg-row" onClick={() => void talkApi.createChat({ type: "private", memberIds: [u.id] }).then(({ chat }) => refreshChats().then(() => openChat(chat.id))).catch(showError)}>
                <TalkAvatar name={u.displayName} src={u.avatar} size="md" online={u.isOnline} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{u.displayName}</span>
                  <span className="tg-muted block truncate text-xs" dir="ltr">
                    @{u.username}
                  </span>
                </span>
              </button>
            ))}
            <p className="tg-section-title">{t("talk.list.chats")}</p>
          </>
        )}
        {list.length === 0 && !peopleHits.length && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Mascot pose={q ? "search" : chats.length ? "think" : "sleep"} size={140} />
            <p className="font-bold">{q ? t("talk.list.noResults") : t("talk.list.noChats")}</p>
            {!q && <p className="tg-muted text-xs">{t("talk.list.noChatsDesc")}</p>}
          </div>
        )}
        {list.map((c) => (
          <ChatRow key={c.id} chat={c} active={c.id === activeChatId} draft={drafts[c.id]} onOpen={() => openChat(c.id)} />
        ))}
      </div>

      {/* ---------- compose FAB ---------- */}
      <GMenu>
        <GMenuTrigger asChild>
          <GBtn variant="primary" size="fab" className="absolute bottom-5 end-5 z-10" aria-label={t("common.new")}>
            <Pencil className="size-5" />
          </GBtn>
        </GMenuTrigger>
        <GMenuContent align="end" side="top">
          <GMenuItem onSelect={() => setPanel({ kind: "newGroup" })}>
            <Users /> {t("talk.menu.newGroup")}
          </GMenuItem>
          <GMenuItem onSelect={() => setPanel({ kind: "newChannel" })}>
            <Megaphone /> {t("talk.menu.newChannel")}
          </GMenuItem>
          <GMenuItem onSelect={() => setPanel({ kind: "contacts" })}>
            <UserPlus /> {t("talk.menu.contacts")}
          </GMenuItem>
          <GMenuItem onSelect={() => setJoin(true)}>
            <Link2 /> {t("talk.menu.joinByLink")}
          </GMenuItem>
        </GMenuContent>
      </GMenu>

      {/* ---------- drawer ---------- */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: locale === "fa" || locale === "ar" ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: locale === "fa" || locale === "ar" ? 320 : -320 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="tg-glass-strong tg-safe-top fixed inset-y-0 start-0 z-50 flex w-[300px] max-w-[85vw] flex-col"
              role="dialog"
            >
              {/* profile head */}
              <div className="relative overflow-hidden p-4 pb-3" style={{ background: "linear-gradient(135deg, var(--talk), var(--talk-strong))" }}>
                <div className="absolute -end-6 -top-8 opacity-30">
                  <Mascot pose="wave" size={120} animate={false} />
                </div>
                <div className="relative flex items-start justify-between">
                  <TalkAvatar name={me.displayName} src={me.avatar} size="lg" className="!shadow-xl ring-2 ring-white/40" onClick={() => setPanel({ kind: "settings", page: "profile" })} />
                  <button type="button" className="tg-call-btn !h-9 !w-9" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label={t("talk.menu.nightMode")}>
                    {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </button>
                </div>
                <p className="relative mt-2 truncate font-black text-white">{me.displayName}</p>
                <p className="relative truncate text-xs text-white/80" dir="ltr">
                  @{me.username}
                </p>
                {accounts.length > 1 && (
                  <div className="relative mt-2 flex gap-1.5">
                    {accounts
                      .filter((a) => !a.current)
                      .map((a) => (
                        <button key={a.user.id} type="button" onClick={() => onSwitch(a.user.id)} title={a.user.displayName} className="rounded-full ring-2 ring-white/40 transition hover:scale-110">
                          <TalkAvatar name={a.user.displayName} src={a.user.avatar} size="xs" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="tg-scroll flex-1 p-2">
                <DrawerItem icon={<UserPlus />} label={t("talk.menu.addAccount")} onClick={onAddAccount} />
                <div className="my-1 h-px bg-[var(--talk-line)]" />
                <DrawerItem icon={<Users />} label={t("talk.menu.newGroup")} onClick={() => setPanel({ kind: "newGroup" })} />
                <DrawerItem icon={<Megaphone />} label={t("talk.menu.newChannel")} onClick={() => setPanel({ kind: "newChannel" })} />
                <DrawerItem icon={<UserPlus />} label={t("talk.menu.contacts")} onClick={() => setPanel({ kind: "contacts" })} />
                <DrawerItem icon={<Phone />} label={t("talk.menu.calls")} onClick={() => setPanel({ kind: "calls" })} />
                <DrawerItem icon={<Bookmark />} label={t("talk.menu.savedMessages")} onClick={() => void openSaved().then(() => setDrawer(false)).catch(showError)} />
                <DrawerItem icon={<Settings />} label={t("talk.menu.settings")} onClick={() => setPanel({ kind: "settings", page: "root" })} />
                <div className="my-1 h-px bg-[var(--talk-line)]" />
                <Link href="/?login=1" className="tg-row text-sm font-medium">
                  <span className="tg-muted [&_svg]:size-5">
                    <Video />
                  </span>
                  {t("talk.menu.asameet")}
                </Link>
                <DrawerItem icon={<LogOut />} label={t("talk.settings.logout")} onClick={onLogout} danger />
              </div>
              <div className="flex items-center gap-2 border-t tg-line p-3">
                <AsatalkLogo size={26} />
                <span className="text-xs font-black">{t("talk.name")}</span>
                <span className="tg-muted ms-auto text-[10px]">v1.0</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {join && <JoinDialog onClose={() => setJoin(false)} />}
    </section>
  );
}

function DrawerItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={cn("tg-row text-sm font-medium", danger && "text-red-500")} onClick={onClick}>
      <span className={cn("[&_svg]:size-5", danger ? "text-red-500" : "tg-muted")}>{icon}</span>
      {label}
    </button>
  );
}

function ChatRow({ chat, active, draft, onOpen }: { chat: Chat; active: boolean; draft?: string; onOpen: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me, users, refreshChats, showError } = useTalk();
  const openChat = useTalkStore((s) => s.openChat);
  const [menu, setMenu] = useState(false);
  const saved = isSavedChat(chat, me.id);
  const title = chatDisplayName(chat, users, me.id, t);
  const peerId = peerOf(chat, me.id);
  const peer = peerId ? users.get(peerId) : undefined;
  const typing = (chat.typingUserIds ?? []).length > 0;
  const lastMine = chat.lastMessageSenderId === me.id;
  const senderName = chat.type !== "private" && chat.lastMessageSenderId ? (lastMine ? t("talk.list.you") : users.get(chat.lastMessageSenderId)?.displayName) : null;

  const preview = typing ? (
    <span className="text-[var(--talk)]">{t("talk.list.typing")}</span>
  ) : draft && !active ? (
    <span>
      <span className="text-red-500">{t("talk.list.draft")}: </span>
      {draft}
    </span>
  ) : chat.lastMessage != null || chat.lastMessageType ? (
    <span>
      {senderName && <span className="text-[var(--talk-fg)]">{senderName}: </span>}
      {messagePreview({ type: chat.lastMessageType ?? "text", content: chat.lastMessage ?? "", meta: {} }, t)}
    </span>
  ) : (
    <span>{t("talk.chat.noMessages")}</span>
  );

  return (
    <GMenu open={menu} onOpenChange={setMenu}>
      <GMenuTrigger asChild>
        <button
          type="button"
          className="tg-row"
          data-active={active}
          onClick={(e) => {
            e.preventDefault();
            onOpen();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu(true);
          }}
          onPointerDown={(e) => e.preventDefault()}
        >
          <TalkAvatar
            name={title}
            src={saved ? null : chat.type === "private" ? peer?.avatar : chat.avatar}
            size="lg"
            online={!saved && chat.type === "private" && peer?.isOnline}
            seed={chat.id}
            icon={saved ? <Bookmark className="size-6" /> : undefined}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              {chat.type === "group" && <Users className="size-3.5 shrink-0 opacity-60" />}
              {chat.type === "channel" && <Megaphone className="size-3.5 shrink-0 opacity-60" />}
              <span className="truncate text-sm font-bold">{title}</span>
              {chat.isMuted && <BellOff className="size-3 shrink-0 opacity-50" />}
              <span className="tg-time ms-auto flex shrink-0 items-center gap-0.5">
                {lastMine && chat.type !== "channel" && (chat.unreadCount === 0 && (peer ? true : true) ? <CheckCheck className="size-3.5 text-[var(--talk)]" /> : <Check className="size-3.5" />)}
                {chat.lastMessageAt && formatRelativeDay(chat.lastMessageAt, locale, t("common.today"), t("common.yesterday"))}
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <span className="tg-muted line-clamp-1 flex-1 text-xs">{preview}</span>
              {chat.unreadCount > 0 ? (
                <span className={cn("tg-badge", chat.isMuted && "tg-badge-muted")}>{toLocaleDigits(chat.unreadCount, locale)}</span>
              ) : chat.isPinned ? (
                <Pin className="size-3.5 shrink-0 rotate-45 opacity-50" />
              ) : null}
            </span>
          </span>
        </button>
      </GMenuTrigger>
      <GMenuContent align="start">
        <GMenuItem onSelect={() => void talkApi.chatPrefs(chat.id, { pinned: !chat.isPinned }).then(refreshChats)}>
          {chat.isPinned ? <PinOff /> : <Pin />} {chat.isPinned ? t("talk.chat.unpin") : t("talk.chat.pin")}
        </GMenuItem>
        <GMenuItem onSelect={() => void talkApi.chatPrefs(chat.id, { muted: !chat.isMuted }).then(refreshChats)}>
          <BellOff /> {chat.isMuted ? t("talk.chat.unmute") : t("talk.chat.mute")}
        </GMenuItem>
        {chat.unreadCount > 0 && (
          <GMenuItem onSelect={() => void talkApi.markRead(chat.id).then(refreshChats)}>
            <Eye /> {t("talk.chat.markRead")}
          </GMenuItem>
        )}
        <GMenuSeparator />
        {chat.type !== "private" ? (
          <GMenuItem
            danger
            onSelect={() =>
              void talkApi
                .chatMembers(chat.id, "leave")
                .then(() => {
                  if (active) openChat(null);
                  return refreshChats();
                })
                .catch(showError)
            }
          >
            <LogOut /> {t("talk.chat.leave")}
          </GMenuItem>
        ) : (
          <GMenuItem
            danger
            onSelect={() =>
              void talkApi
                .deleteChat(chat.id)
                .then(() => {
                  if (active) openChat(null);
                  return refreshChats();
                })
                .catch(showError)
            }
          >
            <Trash2 /> {t("talk.chat.delete")}
          </GMenuItem>
        )}
        <GMenuItem onSelect={() => undefined} className="hidden">
          <Plus />
        </GMenuItem>
      </GMenuContent>
    </GMenu>
  );
}
