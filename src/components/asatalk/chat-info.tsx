"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Ban, Bell, Copy, Crown, FileText, Image as ImageIcon, Link2, LogOut, MoreVertical, Pencil, Phone, RefreshCw, Shield, Trash2, UserMinus, UserPlus, Video, Mic, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl, talkApi } from "@/lib/talk/api";
import { chatDisplayName, isSavedChat, lastSeenLabel, peerOf } from "@/lib/talk/format";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import type { Chat, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { useCalls } from "./calls/call-provider";
import { AvatarPicker, ConfirmDialog, MemberPicker } from "./dialogs";
import { GBtn, GHeader, GItem, GMenu, GMenuContent, GMenuItem, GMenuTrigger, GSection, GSwitch, TalkAvatar } from "./glass";
import { Mascot } from "./mascots";
import { useTalk } from "./talk-data";

export function ChatInfo({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me, users, refreshChats, showError, isBlocked, toggleBlock } = useTalk();
  const { startCall } = useCalls();
  const { openChat, setLightbox } = useTalkStore();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; action: () => Promise<void> } | null>(null);
  const [mediaTab, setMediaTab] = useState<"media" | "files" | "voice">("media");

  const saved = isSavedChat(chat, me.id);
  const peerId = peerOf(chat, me.id);
  const peer = peerId ? users.get(peerId) : undefined;
  const title = chatDisplayName(chat, users, me.id, t);
  const isAdmin = chat.myRole === "owner" || chat.myRole === "admin" || me.role === "admin";
  const isOwner = chat.myRole === "owner" || me.role === "admin";
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/talk/join/${chat.username ?? chat.inviteCode ?? ""}`;

  const msgsQ = useQuery({ queryKey: ["talk", "messages", chat.id], queryFn: () => talkApi.messages(chat.id), staleTime: 5000 });
  const media = useMemo(() => (msgsQ.data?.messages ?? []).filter((m) => m.type === "image" || m.type === "video"), [msgsQ.data]);
  const files = useMemo(() => (msgsQ.data?.messages ?? []).filter((m) => m.type === "file"), [msgsQ.data]);
  const voices = useMemo(() => (msgsQ.data?.messages ?? []).filter((m) => m.type === "voice" || m.type === "video_note"), [msgsQ.data]);

  const members = chat.memberIds.map((id) => users.get(id)).filter(Boolean) as User[];
  const roleOf = (id: string) => (id === chat.createdBy || (chat.adminIds ?? []).includes(id) ? ((chat.adminIds ?? []).includes(id) && id !== chat.createdBy ? "admin" : "owner") : "member");

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      await refreshChats();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <GHeader
        title={chat.type === "private" ? t("talk.info.title") : chat.type === "group" ? t("talk.info.groupInfo") : t("talk.info.channelInfo")}
        onBack={onClose}
        right={
          chat.type !== "private" && isAdmin ? (
            <GBtn variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={t("talk.info.edit")}>
              <Pencil className="size-5" />
            </GBtn>
          ) : undefined
        }
      />
      <div className="tg-scroll flex-1 pb-6">
        {/* hero */}
        <div className="relative flex flex-col items-center gap-2 px-4 pt-6 pb-4 text-center">
          <div className="absolute inset-x-0 top-0 -z-10 h-40 opacity-30" style={{ background: "radial-gradient(60% 80% at 50% 0%, var(--talk-tint-2), transparent)" }} />
          <TalkAvatar
            name={title}
            src={saved ? null : chat.type === "private" ? peer?.avatar : chat.avatar}
            size="xxl"
            seed={chat.id}
            icon={saved ? <span className="text-4xl">🔖</span> : undefined}
            onClick={() => {
              const src = chat.type === "private" ? peer?.avatar : chat.avatar;
              if (src) setLightbox({ src, kind: "image" });
            }}
          />
          <h2 className="mt-1 text-xl font-black">{title}</h2>
          <p className={cn("text-xs", peer?.isOnline ? "text-[var(--talk)]" : "tg-muted")}>
            {chat.type === "private"
              ? saved
                ? t("talk.savedMessages")
                : lastSeenLabel(peer, t, locale)
              : `${toLocaleDigits(chat.memberIds.length, locale)} ${t(chat.type === "channel" ? "talk.chat.subscribers" : "talk.chat.members")}`}
          </p>
          {peer && !saved && (
            <div className="mt-2 flex gap-2">
              <GBtn size="sm" onClick={() => void startCall(peer, "audio")}>
                <Phone className="size-4" /> {t("talk.chat.call")}
              </GBtn>
              <GBtn size="sm" onClick={() => void startCall(peer, "video")}>
                <Video className="size-4" /> {t("talk.chat.videoCall")}
              </GBtn>
            </div>
          )}
        </div>

        <div className="px-3">
          {/* details */}
          <GSection>
            {peer && !saved && (
              <GItem icon={<AtSign className="size-4" />} label={<span dir="ltr">@{peer.username}</span>} value={t("talk.info.username")} onClick={() => { void navigator.clipboard.writeText(`@${peer.username}`); toast.success(t("talk.msg.copied")); }} />
            )}
            {peer && !saved && <GItem icon={<FileText className="size-4" />} color="linear-gradient(135deg,#f59e0b,#d97706)" label={peer.bio || <span className="tg-muted">{t("talk.info.noBio")}</span>} value={t("talk.info.bio")} />}
            {chat.type !== "private" && chat.description && <GItem icon={<FileText className="size-4" />} color="linear-gradient(135deg,#f59e0b,#d97706)" label={<span className="whitespace-pre-wrap text-sm">{chat.description}</span>} />}
            {chat.type !== "private" && chat.username && (
              <GItem icon={<AtSign className="size-4" />} label={<span dir="ltr">@{chat.username}</span>} value={t("talk.info.publicLink")} onClick={() => { void navigator.clipboard.writeText(link); toast.success(t("talk.info.linkCopied")); }} />
            )}
            {chat.type !== "private" && (
              <GItem
                icon={<Link2 className="size-4" />}
                color="linear-gradient(135deg,#10b981,#059669)"
                label={<span className="truncate text-xs" dir="ltr">{link}</span>}
                value={t("talk.info.inviteLink")}
                onClick={() => {
                  if (navigator.share) void navigator.share({ url: link, title }).catch(() => undefined);
                  else {
                    void navigator.clipboard.writeText(link);
                    toast.success(t("talk.info.linkCopied"));
                  }
                }}
                right={
                  isAdmin ? (
                    <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-8 !w-8" onClick={(e) => { e.stopPropagation(); void run(() => talkApi.updateChat(chat.id, { resetInvite: true })); }} aria-label={t("talk.info.resetLink")}>
                      <RefreshCw className="size-4" />
                    </button>
                  ) : (
                    <Copy className="tg-muted size-4" />
                  )
                }
              />
            )}
            <GItem
              icon={<Bell className="size-4" />}
              color="linear-gradient(135deg,#ef4444,#dc2626)"
              label={t("talk.info.notifications")}
              right={<GSwitch on={!chat.isMuted} onChange={(v) => void run(() => talkApi.chatPrefs(chat.id, { muted: !v }))} />}
            />
          </GSection>

          {/* shared media */}
          <div className="mb-4">
            <div className="flex gap-1 px-1 pb-1">
              {(["media", "files", "voice"] as const).map((k) => (
                <button key={k} type="button" className="tg-chip" data-active={mediaTab === k} onClick={() => setMediaTab(k)}>
                  {k === "media" ? <ImageIcon className="size-3.5" /> : k === "files" ? <FileText className="size-3.5" /> : <Mic className="size-3.5" />}
                  {t(`talk.info.${k}`)} {toLocaleDigits(k === "media" ? media.length : k === "files" ? files.length : voices.length, locale)}
                </button>
              ))}
            </div>
            <div className="tg-section p-2">
              {mediaTab === "media" &&
                (media.length ? (
                  <div className="grid grid-cols-3 gap-1">
                    {media.map((m) => (
                      <button key={m.id} type="button" className="aspect-square overflow-hidden rounded-lg bg-black/5" onClick={() => setLightbox({ src: mediaUrl(m.mediaId!), kind: m.type === "video" ? "video" : "image", caption: m.content })}>
                        {m.type === "video" ? <video src={mediaUrl(m.mediaId!)} className="h-full w-full object-cover" muted /> : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(m.mediaId!)} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty />
                ))}
              {mediaTab === "files" &&
                (files.length ? (
                  files.map((m) => (
                    <a key={m.id} href={mediaUrl(m.mediaId!)} download={m.meta?.fileName} className="tg-row">
                      <span className="tg-play !rounded-xl !h-9 !w-9"><FileText className="size-4" /></span>
                      <span className="truncate text-sm">{m.meta?.fileName ?? t("talk.msg.file")}</span>
                    </a>
                  ))
                ) : (
                  <Empty />
                ))}
              {mediaTab === "voice" &&
                (voices.length ? (
                  voices.map((m) => (
                    <div key={m.id} className="tg-row cursor-default">
                      <span className="tg-play !h-9 !w-9">{m.type === "voice" ? <Mic className="size-4" /> : <Video className="size-4" />}</span>
                      <span className="text-sm">{users.get(m.senderId)?.displayName}</span>
                      <span className="tg-muted ms-auto text-xs">{toLocaleDigits(m.meta?.duration ?? 0, locale)}s</span>
                    </div>
                  ))
                ) : (
                  <Empty />
                ))}
            </div>
          </div>

          {/* members */}
          {chat.type !== "private" && (
            <GSection title={`${t("talk.info.members")} · ${toLocaleDigits(members.length, locale)}`}>
              {(chat.type === "group" || isAdmin) && (
                <GItem icon={<UserPlus className="size-4" />} label={t("talk.info.addMembers")} onClick={() => setAdding(true)} />
              )}
              {members.map((u) => {
                const role = roleOf(u.id);
                return (
                  <div key={u.id} className="tg-item cursor-default">
                    <TalkAvatar name={u.displayName} src={u.avatar} size="sm" online={u.isOnline} onClick={() => u.id !== me.id && void talkApi.createChat({ type: "private", memberIds: [u.id] }).then(({ chat }) => refreshChats().then(() => openChat(chat.id)))} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.displayName}{u.id === me.id ? ` (${t("talk.list.you")})` : ""}</span>
                      <span className={cn("block text-xs", u.isOnline ? "text-[var(--talk)]" : "tg-muted")}>{u.isOnline ? t("common.online") : lastSeenLabel(u, t, locale)}</span>
                    </span>
                    {role !== "member" && (
                      <span className="tg-muted inline-flex items-center gap-1 text-[11px]">
                        {role === "owner" ? <Crown className="size-3.5 text-amber-500" /> : <Shield className="size-3.5" />}
                        {t(`talk.info.${role}`)}
                      </span>
                    )}
                    {isAdmin && u.id !== me.id && role !== "owner" && (
                      <GMenu>
                        <GMenuTrigger asChild>
                          <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-8 !w-8" aria-label="more">
                            <MoreVertical className="size-4" />
                          </button>
                        </GMenuTrigger>
                        <GMenuContent align="end">
                          {isOwner && (
                            <GMenuItem onSelect={() => void run(() => talkApi.chatMembers(chat.id, role === "admin" ? "demote" : "promote", u.id))}>
                              <Shield /> {role === "admin" ? t("talk.info.demote") : t("talk.info.promote")}
                            </GMenuItem>
                          )}
                          {(isOwner || role === "member") && (
                            <GMenuItem danger onSelect={() => void run(() => talkApi.chatMembers(chat.id, "remove", u.id))}>
                              <UserMinus /> {t("talk.info.remove")}
                            </GMenuItem>
                          )}
                        </GMenuContent>
                      </GMenu>
                    )}
                  </div>
                );
              })}
            </GSection>
          )}

          {/* danger zone */}
          <GSection>
            {peerId && !saved && (
              <GItem icon={<Ban className="size-4" />} color="linear-gradient(135deg,#f97316,#ea580c)" label={isBlocked(peerId) ? t("talk.chat.unblock") : t("talk.chat.block")} onClick={() => void toggleBlock(peerId)} />
            )}
            {chat.type !== "private" && (
              <GItem
                icon={<LogOut className="size-4" />}
                color="linear-gradient(135deg,#ef4444,#b91c1c)"
                label={chat.type === "group" ? t("talk.info.leave") : t("talk.info.leaveChannel")}
                danger
                onClick={() =>
                  setConfirm({
                    title: t("talk.chat.leaveConfirm"),
                    action: async () => {
                      await talkApi.chatMembers(chat.id, "leave");
                      openChat(null);
                      onClose();
                      await refreshChats();
                    },
                  })
                }
              />
            )}
            {(chat.type === "private" || isOwner) && (
              <GItem
                icon={<Trash2 className="size-4" />}
                color="linear-gradient(135deg,#ef4444,#b91c1c)"
                label={chat.type === "private" ? t("talk.info.deleteChat") : chat.type === "group" ? t("talk.info.deleteGroup") : t("talk.info.deleteChannel")}
                danger
                onClick={() =>
                  setConfirm({
                    title: t("talk.chat.deleteConfirm"),
                    action: async () => {
                      if (chat.type === "private") await talkApi.deleteChat(chat.id);
                      else await talkApi.chatMembers(chat.id, "delete");
                      openChat(null);
                      onClose();
                      await refreshChats();
                    },
                  })
                }
              />
            )}
          </GSection>
          <div className="flex justify-center opacity-70">
            <Mascot pose={chat.type === "channel" ? "megaphone" : chat.type === "group" ? "group" : "cool"} size={110} />
          </div>
        </div>
      </div>

      {editing && <EditChatDialog chat={chat} onClose={() => setEditing(false)} />}
      {adding && (
        <AddMembersDialog
          chat={chat}
          onClose={() => setAdding(false)}
          onAdd={async (ids) => {
            for (const id of ids) await talkApi.chatMembers(chat.id, "add", id).catch(showError);
            await refreshChats();
            setAdding(false);
          }}
        />
      )}
      {confirm && <ConfirmDialog title={confirm.title} danger onCancel={() => setConfirm(null)} onConfirm={async () => { try { await confirm.action(); } catch (e) { showError(e); } setConfirm(null); }} />}
    </div>
  );
}

function Empty() {
  const t = useT();
  return <p className="tg-muted p-4 text-center text-xs">{t("talk.info.noMedia")}</p>;
}

function EditChatDialog({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const t = useT();
  const { refreshChats, showError } = useTalk();
  const [name, setName] = useState(chat.name ?? "");
  const [desc, setDesc] = useState(chat.description ?? "");
  const [username, setUsername] = useState(chat.username ?? "");
  const [avatar, setAvatar] = useState<string | null>(chat.avatar);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="talk max-w-md !rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("talk.info.edit")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <AvatarPicker value={avatar} onChange={setAvatar} name={name} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("talk.info.name")} className="tg-input" maxLength={80} />
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("talk.info.description")} className="tg-input min-h-20" maxLength={255} />
        <div>
          <div className="relative">
            <span className="tg-muted absolute start-3 top-1/2 -translate-y-1/2 text-sm">@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder={t("talk.info.publicLink")} className="tg-input ps-8" dir="ltr" maxLength={32} />
          </div>
          <p className="tg-hint !px-1">{t("talk.info.publicLinkHint")}</p>
        </div>
        <div className="flex justify-end gap-2">
          {avatar && (
            <GBtn variant="ghost" onClick={() => setAvatar(null)}>
              <X className="size-4" /> {t("talk.settings.removePhoto")}
            </GBtn>
          )}
          <GBtn
            variant="primary"
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await talkApi.updateChat(chat.id, {
                  name: name.trim(),
                  description: desc,
                  username: username.trim(),
                  avatar: avatar && avatar !== chat.avatar ? avatar : undefined,
                  clearAvatar: !avatar && !!chat.avatar,
                });
                await refreshChats();
                toast.success(t("talk.info.saved"));
                onClose();
              } catch (e) {
                showError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Check className="size-4" /> {t("talk.info.save")}
          </GBtn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMembersDialog({ chat, onClose, onAdd }: { chat: Chat; onClose: () => void; onAdd: (ids: string[]) => Promise<void> }) {
  const t = useT();
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel([]), [chat.id]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="talk max-w-md !rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("talk.info.addMembers")}</DialogTitle>
        </DialogHeader>
        <MemberPicker exclude={chat.memberIds} selected={sel} onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
        <GBtn
          variant="primary"
          disabled={sel.length === 0 || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd(sel);
            setBusy(false);
          }}
        >
          <UserPlus className="size-4" /> {t("talk.info.addMembers")} ({sel.length})
        </GBtn>
      </DialogContent>
    </Dialog>
  );
}
