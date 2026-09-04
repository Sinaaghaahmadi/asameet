"use client";

/** Home: header, notes strip, folder chips, archive row, chat rows, FAB and drawer — per the design hand-off. */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, BellOff, Bookmark, Check, CheckCheck, Eye, Link2, LogOut, Megaphone, Menu, Moon, Pencil, Phone, Pin, PinOff, Plus, Search, Settings, Trash2, UserPlus, Users, Video, X } from "lucide-react";
import { talkApi } from "@/lib/talk/api";
import { chatDisplayName, isSavedChat, messagePreview, peerOf } from "@/lib/talk/format";
import { useLocale, useT } from "@/lib/i18n";
import { cn, formatRelativeDay, toLocaleDigits } from "@/lib/utils";
import type { Chat } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { JoinDialog } from "./dialogs";
import { GBtn, GMenu, GMenuContent, GMenuItem, GMenuSeparator, GMenuTrigger, GSearch, GSwitch, TalkAvatar } from "./glass";
import { AsatalkLogo, Mascot } from "./mascots";
import { StatusStrip } from "./status";
import { useTalk } from "./talk-data";

export function ChatList({ onLogout, onAddAccount, onSwitch }: { onLogout: () => void; onAddAccount: () => void; onSwitch: (userId: string) => void }) {
  const t = useT();
  const { locale, dir } = useLocale();
  const { me, users, chats, loading, refreshChats, openSaved, showError } = useTalk();
  const { activeChatId, openChat, folder, setFolder, setPanel, drawerOpen, setDrawer, settings, accounts, drafts } = useTalkStore();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [join, setJoin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
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

  const archived = useMemo(() => chats.filter((c) => c.isArchived), [chats]);
  const list = useMemo(() => {
    const custom = folder.startsWith("f:") ? settings.folders?.find((f) => `f:${f.id}` === folder) : null;
    return chats.filter((c) => {
      if (!q && !!c.isArchived !== showArchive) return false;
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
  }, [chats, folder, q, settings.folders, users, me.id, t, showArchive]);

  const unreadTotal = chats.reduce((s, c) => s + (c.isMuted || c.isArchived ? 0 : c.unreadCount), 0);
  const peopleHits = q
    ? Array.from(users.values()).filter((u) => u.id !== me.id && (u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase().replace("@", "")))).slice(0, 5)
    : [];
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <section className="tg-panel relative flex h-full w-full flex-col md:border-e md:tg-line" aria-label={t("talk.list.chats")}>
      {/* ---------- header (52px) ---------- */}
      <div className="tg-safe-top flex h-[60px] items-center gap-1 px-2 pt-1">
        {showArchive ? (
          <GBtn variant="ghost" size="icon" onClick={() => setShowArchive(false)} aria-label={t("common.back")}>
            <Back className="size-5" />
          </GBtn>
        ) : (
          <GBtn variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="menu" className="relative">
            <Menu className="size-5" />
            {unreadTotal > 0 && <span className="tg-badge absolute -end-0.5 -top-0.5 !h-4 !min-w-4 !text-[9px]">{toLocaleDigits(unreadTotal > 99 ? "99+" : unreadTotal, locale)}</span>}
          </GBtn>
        )}
        {searching ? (
          <div className="flex-1">
            <GSearch value={q} onChange={setQ} placeholder={t("talk.list.search")} icon={<Search />} autoFocus />
          </div>
        ) : (
          <h1 className="tg-title flex-1 truncate px-1">{showArchive ? t("talk.home.archive") : t("talk.home.title")}</h1>
        )}
        <GBtn
          variant="ghost"
          size="icon"
          aria-label={searching ? t("common.close") : t("talk.list.search")}
          onClick={() => {
            setSearching((v) => !v);
            setQ("");
          }}
        >
          {searching ? <X className="size-5" /> : <Search className="size-5" />}
        </GBtn>
      </div>

      {/* ---------- notes / status strip ---------- */}
      {!searching && !showArchive && <StatusStrip />}

      {/* ---------- folders ---------- */}
      {!showArchive && (
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-1.5">
          {folders.map((f) => {
            const unread = f.id === "all" ? 0 : chats.filter((c) => !c.isArchived && (f.id === "personal" ? c.type === "private" : f.id === "groups" ? c.type === "group" : f.id === "channels" ? c.type === "channel" : f.id === "unread" ? true : settings.folders?.find((x) => `f:${x.id}` === f.id)?.chatIds.includes(c.id))).reduce((s, c) => s + (c.isMuted ? 0 : c.unreadCount), 0);
            return (
              <button key={f.id} type="button" className="tg-chip" data-active={folder === f.id} onClick={() => setFolder(f.id)}>
                {f.label}
                {unread > 0 && <span className={cn("tg-badge !h-4 !min-w-4 !text-[9px]", folder === f.id && "!bg-white !text-[var(--talk-strong)]")}>{toLocaleDigits(unread, locale)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- list ---------- */}
      <div className="tg-scroll flex-1 px-1.5 pb-24">
        {loading && chats.length === 0 && <Skeleton />}
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
        {!q && !showArchive && archived.length > 0 && folder === "all" && (
          <button type="button" className="tg-row" onClick={() => setShowArchive(true)}>
            <TalkAvatar name={t("talk.home.archive")} size="lg" icon={<Archive className="size-6" />} className="!bg-[oklch(0.6_0.02_var(--talk-h))]" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-[14.5px] font-bold">{t("talk.home.archive")}</span>
                <span className="tg-time ms-auto">{archived[0]?.lastMessageAt && formatRelativeDay(archived[0].lastMessageAt, locale, t("common.today"), t("common.yesterday"))}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="tg-muted line-clamp-1 flex-1 text-[12.5px]">
                  {archived
                    .slice(0, 2)
                    .map((c) => chatDisplayName(c, users, me.id, t))
                    .join("، ")}
                  {archived.length > 2 && ` ${t("talk.home.andMore").replace("{n}", toLocaleDigits(archived.length - 2, locale))}`}
                </span>
                {archived.some((c) => c.unreadCount > 0) && <span className="tg-badge tg-badge-muted">{toLocaleDigits(archived.reduce((s, c) => s + c.unreadCount, 0), locale)}</span>}
              </span>
            </span>
          </button>
        )}
        {!loading && list.length === 0 && !peopleHits.length && (
          <div className="flex flex-col items-center gap-2 px-8 pb-8 pt-10 text-center">
            <Mascot pose={q ? "search" : chats.length ? "think" : "sleep"} size={170} />
            <p className="text-[17px] font-black">{q ? t("talk.list.noResults") : t("talk.list.noChats")}</p>
            {!q && <p className="tg-muted text-[13px]">{t("talk.list.noChatsDesc")}</p>}
            {!q && !showArchive && (
              <GBtn variant="primary" className="mt-3" onClick={() => setPanel({ kind: "contacts" })}>
                {t("talk.menu.contacts")}
              </GBtn>
            )}
          </div>
        )}
        {list.map((c) => (
          <ChatRow key={c.id} chat={c} active={c.id === activeChatId} draft={drafts[c.id]} onOpen={() => openChat(c.id)} />
        ))}
      </div>

      {/* ---------- compose FAB ---------- */}
      <GMenu>
        <GMenuTrigger asChild>
          <GBtn variant="primary" size="fab" className="absolute bottom-6 start-[22px] z-10" aria-label={t("common.new")}>
            <Pencil className="size-5" />
          </GBtn>
        </GMenuTrigger>
        <GMenuContent align="start" side="top">
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
              initial={{ x: dir === "rtl" ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? 320 : -320 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="tg-glass-strong fixed inset-y-0 start-0 z-50 flex w-[310px] max-w-[86vw] flex-col"
              role="dialog"
            >
              {/* gradient head */}
              <div className="relative overflow-hidden px-5 pb-4 pt-[52px]" style={{ background: "linear-gradient(135deg, var(--talk), var(--talk-strong))" }}>
                <div className="absolute -end-4 -top-6 opacity-25">
                  <Mascot pose="wave" size={130} animate={false} />
                </div>
                <div className="relative flex items-end justify-between">
                  <button type="button" className="rounded-full ring-[3px] ring-white/50" onClick={() => setPanel({ kind: "settings", page: "profile" })} aria-label={t("talk.settings.profile")}>
                    <TalkAvatar name={me.displayName} src={me.avatar} size="xl" className="!size-16 !shadow-xl" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {accounts
                      .filter((a) => !a.current)
                      .slice(0, 3)
                      .map((a) => (
                        <button key={a.user.id} type="button" onClick={() => onSwitch(a.user.id)} title={a.user.displayName} className="rounded-full ring-2 ring-white/50 transition hover:scale-110">
                          <TalkAvatar name={a.user.displayName} src={a.user.avatar} size="sm" className="!size-[34px] !text-xs" />
                        </button>
                      ))}
                    <button type="button" onClick={onAddAccount} aria-label={t("talk.menu.addAccount")} className="flex size-[34px] items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white transition hover:bg-white/15">
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="relative mt-3 truncate text-[17px] font-black text-white">{me.displayName}</p>
                <p className="relative truncate text-[12px] text-white/85" dir="ltr">
                  {me.username}@{me.phone ? ` · ${me.phone}` : me.email ? ` · ${me.email}` : ""}
                </p>
              </div>
              <div className="tg-scroll flex-1 p-2">
                <DrawerItem icon={<Users />} tint={240} label={t("talk.menu.newGroup")} onClick={() => setPanel({ kind: "newGroup" })} />
                <DrawerItem icon={<Megaphone />} tint={55} label={t("talk.menu.newChannel")} onClick={() => setPanel({ kind: "newChannel" })} />
                <DrawerItem icon={<UserPlus />} tint={295} label={t("talk.menu.contacts")} onClick={() => setPanel({ kind: "contacts" })} />
                <DrawerItem icon={<Phone />} tint={150} label={t("talk.menu.calls")} onClick={() => setPanel({ kind: "calls" })} />
                <DrawerItem icon={<Bookmark />} tint={200} label={t("talk.menu.savedMessages")} onClick={() => void openSaved().then(() => setDrawer(false)).catch(showError)} />
                <DrawerItem icon={<Settings />} tint={270} label={t("talk.menu.settings")} onClick={() => setPanel({ kind: "settings", page: "root" })} />
                <div className="tg-row text-[14px] font-medium">
                  <span className="tg-item-icon" style={{ background: "oklch(0.55 0.15 280)" }}>
                    <Moon className="size-[18px]" />
                  </span>
                  <span className="flex-1">{t("talk.menu.nightMode")}</span>
                  <GSwitch on={resolvedTheme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} label={t("talk.menu.nightMode")} />
                </div>
                <div className="my-1.5 h-px bg-[var(--talk-line)]" />
                <Link href="/?login=1" className="tg-row text-[14px] font-medium">
                  <span className="tg-item-icon" style={{ background: "oklch(0.6 0.13 175)" }}>
                    <Video className="size-[18px]" />
                  </span>
                  {t("talk.menu.asameet")}
                </Link>
                <DrawerItem icon={<LogOut />} tint={20} label={t("talk.settings.logout")} onClick={onLogout} danger />
              </div>
              <div className="flex items-center gap-2 border-t tg-line px-4 py-3">
                <AsatalkLogo size={24} />
                <span className="tg-muted text-[11px] font-semibold">{t("talk.home.version")}</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {join && <JoinDialog onClose={() => setJoin(false)} />}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse px-2 pt-1" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <span className="asa-skel !size-[54px] !rounded-full" />
          <span className="flex-1">
            <span className="asa-skel h-3.5 w-[45%]" />
            <span className="asa-skel mt-2 h-3 w-[70%]" />
          </span>
          <span className="asa-skel h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

function DrawerItem({ icon, label, onClick, danger, tint }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; tint: number }) {
  return (
    <button type="button" className={cn("tg-row text-[14px] font-medium", danger && "text-red-500")} onClick={onClick}>
      <span className="tg-item-icon [&_svg]:size-[18px]" style={{ background: danger ? "oklch(0.6 0.2 25)" : `oklch(0.6 0.15 ${tint})` }}>
        {icon}
      </span>
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
  const typingIds = (chat.typingUserIds ?? []).filter((id) => id !== me.id);
  const typing = typingIds.length > 0;
  const lastMine = chat.lastMessageSenderId === me.id;
  const senderName = chat.type !== "private" && chat.lastMessageSenderId ? (lastMine ? t("talk.list.you") : users.get(chat.lastMessageSenderId)?.displayName) : null;
  const delivered = (chat.readCount ?? 0) > 0;

  const preview = typing ? (
    <span className="flex items-center gap-1 text-[var(--talk)]">
      <span className="flex gap-0.5">
        <span className="tg-typing-dot" />
        <span className="tg-typing-dot" style={{ animationDelay: "0.15s" }} />
        <span className="tg-typing-dot" style={{ animationDelay: "0.3s" }} />
      </span>
      {chat.type === "private" ? t("talk.list.typing") : typingIds.length > 1 ? t("talk.list.typingMany") : `${users.get(typingIds[0])?.displayName ?? ""} ${t("talk.list.typing")}`}
    </span>
  ) : draft && !active ? (
    <span>
      <span className="text-red-500">{t("talk.list.draft")}: </span>
      {draft}
    </span>
  ) : chat.lastMessage != null || chat.lastMessageType ? (
    <span>
      {senderName && <span className={cn("font-semibold", active ? "text-white" : "text-[var(--talk)]")}>{senderName}: </span>}
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
          className="tg-row !py-2"
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
            className={cn(saved && "!bg-[linear-gradient(145deg,var(--talk),var(--talk-strong))]")}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              {chat.type === "group" && <Users className="size-3.5 shrink-0 opacity-60" />}
              {chat.type === "channel" && <Megaphone className="size-3.5 shrink-0 opacity-60" />}
              <span className="truncate text-[14.5px] font-bold">{title}</span>
              {chat.isMuted && <BellOff className="size-3 shrink-0 opacity-50" />}
              <span className="tg-time ms-auto flex shrink-0 items-center gap-0.5">
                {lastMine && chat.type !== "channel" && !saved && (delivered ? <CheckCheck className={cn("size-3.5", !active && "text-[var(--talk)]")} /> : <Check className="size-3.5" />)}
                {chat.lastMessageAt && formatRelativeDay(chat.lastMessageAt, locale, t("common.today"), t("common.yesterday"))}
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <span className="tg-muted line-clamp-1 flex-1 text-[12.5px]">{preview}</span>
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
        <GMenuItem
          onSelect={() =>
            void talkApi
              .chatPrefs(chat.id, { archived: !chat.isArchived })
              .then(() => {
                if (active) openChat(null);
                return refreshChats();
              })
              .catch(showError)
          }
        >
          {chat.isArchived ? <ArchiveRestore /> : <Archive />} {chat.isArchived ? t("talk.home.unarchive") : t("talk.home.archive")}
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
      </GMenuContent>
    </GMenu>
  );
}
