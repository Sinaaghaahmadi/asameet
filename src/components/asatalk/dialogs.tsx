"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, Link2, Megaphone, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { talkApi } from "@/lib/talk/api";
import { makeAvatarDataUrl } from "@/lib/talk/media";
import { chatDisplayName, isSavedChat } from "@/lib/talk/format";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import type { Chat, ChatPreview, Message, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { GBtn, GHeader, GSearch, TalkAvatar } from "./glass";
import { Mascot } from "./mascots";
import { useTalk } from "./talk-data";

/* ---------- Confirm ---------- */

export function ConfirmDialog({ title, desc, danger, confirmLabel, onConfirm, onCancel }: { title: string; desc?: string; danger?: boolean; confirmLabel?: string; onConfirm: () => void | Promise<void>; onCancel: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="talk max-w-sm !rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {desc && <p className="tg-muted text-sm">{desc}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <GBtn variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </GBtn>
          <GBtn
            variant={danger ? "danger" : "primary"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {confirmLabel ?? t("common.confirm")}
          </GBtn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Contacts panel ---------- */

export function ContactsPanel({ onBack }: { onBack: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me, userList, openPrivateChat, showError } = useTalk();
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      userList
        .filter((u) => u.id !== me.id && !u.isSuspended)
        .filter((u) => !q || u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase().replace("@", "")))
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.displayName.localeCompare(b.displayName, locale)),
    [userList, me.id, q, locale]
  );
  return (
    <div className="flex h-full flex-col">
      <GHeader title={t("talk.contacts.title")} onBack={onBack} />
      <div className="p-3">
        <GSearch value={q} onChange={setQ} placeholder={t("talk.contacts.search")} icon={<Search />} autoFocus />
      </div>
      <div className="tg-scroll flex-1 px-2 pb-4">
        <p className="tg-section-title">{t("talk.contacts.all")}</p>
        {list.map((u) => (
          <button key={u.id} type="button" className="tg-row" onClick={() => void openPrivateChat(u.id).then(onBack).catch(showError)}>
            <TalkAvatar name={u.displayName} src={u.avatar} size="md" online={u.isOnline} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{u.displayName}</span>
              <span className={cn("block truncate text-xs", u.isOnline ? "text-[var(--talk)]" : "tg-muted")} dir="ltr">
                {u.isOnline ? t("talk.contacts.online") : `@${u.username}`}
              </span>
            </span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="p-6 text-center">
            <Mascot pose="search" size={120} />
            <p className="tg-muted mt-2 text-sm">{t("talk.contacts.noResults")}</p>
          </div>
        )}
        <div className="mt-4 px-2">
          <GBtn
            className="w-full"
            onClick={() => {
              const text = `${t("talk.contacts.inviteText")}: ${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/talk`;
              if (navigator.share) void navigator.share({ text }).catch(() => undefined);
              else {
                void navigator.clipboard.writeText(text);
                toast.success(t("talk.msg.copied"));
              }
            }}
          >
            <Link2 className="size-4" /> {t("talk.contacts.invite")}
          </GBtn>
        </div>
      </div>
    </div>
  );
}

/* ---------- Member picker (shared by new group / add members) ---------- */

export function MemberPicker({ exclude, selected, onToggle }: { exclude: string[]; selected: string[]; onToggle: (id: string) => void }) {
  const t = useT();
  const { userList } = useTalk();
  const [q, setQ] = useState("");
  const list = userList.filter((u) => !exclude.includes(u.id) && !u.isSuspended && (!q || u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase())));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <GSearch value={q} onChange={setQ} placeholder={t("talk.contacts.search")} icon={<Search />} />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => {
            const u = userList.find((x) => x.id === id);
            return (
              <button key={id} type="button" className="tg-chip" data-active="true" onClick={() => onToggle(id)}>
                {u?.displayName} <X className="size-3" />
              </button>
            );
          })}
        </div>
      )}
      <div className="tg-scroll max-h-72 min-h-0 flex-1">
        {list.map((u) => {
          const on = selected.includes(u.id);
          return (
            <button key={u.id} type="button" className="tg-row" onClick={() => onToggle(u.id)}>
              <span className={cn("flex size-6 items-center justify-center rounded-full border-2", on ? "border-[var(--talk)] bg-[var(--talk)] text-white" : "border-[var(--talk-line)]")}>{on && <Check className="size-3.5" />}</span>
              <TalkAvatar name={u.displayName} src={u.avatar} size="sm" online={u.isOnline} />
              <span className="min-w-0 flex-1 truncate text-sm">{u.displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Avatar picker (round, glossy) ---------- */

export function AvatarPicker({ value, onChange, name, size = "xl" }: { value: string | null; onChange: (dataUrl: string | null) => void; name: string; size?: "xl" | "xxl" }) {
  const t = useT();
  return (
    <label className="relative inline-block cursor-pointer">
      <TalkAvatar name={name || "?"} src={value} size={size} />
      <span className="tg-btn tg-btn-primary tg-icon absolute -bottom-1 -end-1 !h-9 !w-9">
        <Camera className="size-4" />
      </span>
      <input
        type="file"
        accept="image/*"
        hidden
        aria-label={t("talk.settings.setPhoto")}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await makeAvatarDataUrl(f));
          e.target.value = "";
        }}
      />
    </label>
  );
}

/* ---------- New group / channel ---------- */

export function NewChatPanel({ kind, onBack }: { kind: "group" | "channel"; onBack: () => void }) {
  const t = useT();
  const { me, refreshChats, showError } = useTalk();
  const openChat = useTalkStore((s) => s.openChat);
  const [step, setStep] = useState<1 | 2>(kind === "channel" ? 2 : 1);
  const [members, setMembers] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ns = kind === "group" ? "talk.newGroup" : "talk.newChannel";

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { chat } = await talkApi.createChat({ type: kind, name: name.trim(), memberIds: members, description: desc.trim() || undefined, avatar: avatar ?? undefined });
      await refreshChats();
      openChat(chat.id);
      onBack();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <GHeader title={t(`${ns}.title`)} onBack={step === 2 && kind === "group" ? () => setStep(1) : onBack} subtitle={step === 1 ? `${toLocaleDigits(members.length, "fa")} ${t("talk.newGroup.selected")}` : undefined} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {step === 1 ? (
          <>
            <MemberPicker exclude={[me.id]} selected={members} onToggle={(id) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))} />
            <p className="tg-hint !px-1">{t("talk.newGroup.hint")}</p>
            <GBtn variant="primary" disabled={members.length === 0} onClick={() => setStep(2)}>
              {t("talk.newGroup.next")}
            </GBtn>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <AvatarPicker value={avatar} onChange={setAvatar} name={name} />
              <div className="flex-1 space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(`${ns}.name`)} className="tg-input" maxLength={80} autoFocus />
              </div>
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t(`${ns}.description`)} className="tg-input min-h-20" maxLength={255} />
            <div className="tg-glass flex items-center gap-3 rounded-2xl p-3">
              <Mascot pose={kind === "group" ? "group" : "megaphone"} size={90} animate={false} />
              <p className="tg-muted text-xs leading-5">{t(`${ns}.hint`)}</p>
            </div>
            <div className="flex-1" />
            <GBtn variant="primary" disabled={!name.trim() || busy} onClick={() => void create()}>
              {kind === "group" ? <Users className="size-4" /> : <Megaphone className="size-4" />} {t(`${ns}.create`)}
            </GBtn>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Forward picker ---------- */

export function ForwardPicker({ messages, onClose, onDone }: { messages: Message[]; onClose: () => void; onDone: (chatId: string) => Promise<void> }) {
  const t = useT();
  const { chats, users, me } = useTalk();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = chats.filter((c) => (c.type !== "channel" || c.myRole === "owner" || c.myRole === "admin") && (!q || chatDisplayName(c, users, me.id, t).toLowerCase().includes(q.toLowerCase())));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="talk max-w-md !rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {t("talk.chat.forwardTo")} <span className="tg-muted text-xs">({messages.length})</span>
          </DialogTitle>
        </DialogHeader>
        <GSearch value={q} onChange={setQ} placeholder={t("talk.list.search")} icon={<Search />} autoFocus />
        <div className="tg-scroll max-h-80 -mx-2">
          {list.map((c) => {
            const title = chatDisplayName(c, users, me.id, t);
            return (
              <button
                key={c.id}
                type="button"
                className="tg-row"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDone(c.id);
                  setBusy(false);
                }}
              >
                <TalkAvatar name={title} src={c.avatar} size="sm" seed={c.id} icon={isSavedChat(c, me.id) ? <span>🔖</span> : undefined} />
                <span className="truncate text-sm font-medium">{title}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Join via link ---------- */

export function JoinDialog({ initial, onClose }: { initial?: string; onClose: () => void }) {
  const t = useT();
  const { refreshChats, showError } = useTalk();
  const openChat = useTalkStore((s) => s.openChat);
  const [ref, setRef] = useState(initial ?? "");
  const [preview, setPreview] = useState<ChatPreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) void lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function lookup(r: string) {
    setBusy(true);
    try {
      const { preview } = await talkApi.previewJoin(r);
      setPreview(preview);
    } catch {
      setPreview(null);
      toast.error(t("talk.join.notFound"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="talk max-w-sm !rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("talk.join.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("talk.join.placeholder")} className="tg-input" dir="ltr" />
          <GBtn onClick={() => void lookup(ref)} disabled={!ref.trim() || busy}>
            {t("talk.join.preview")}
          </GBtn>
        </div>
        {preview && (
          <div className="tg-glass flex items-center gap-3 rounded-2xl p-3">
            <TalkAvatar name={preview.name ?? "?"} src={preview.avatar} size="lg" seed={preview.id} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{preview.name}</p>
              <p className="tg-muted text-xs">
                {toLocaleDigits(preview.memberCount, "fa")} {t(preview.type === "channel" ? "talk.chat.subscribers" : "talk.chat.members")}
              </p>
              {preview.description && <p className="tg-muted mt-1 line-clamp-2 text-xs">{preview.description}</p>}
            </div>
            <GBtn
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { chat } = await talkApi.join(ref);
                  await refreshChats();
                  openChat(chat.id);
                  onClose();
                } catch (e) {
                  showError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {preview.joined ? t("talk.join.open") : t("talk.join.join")}
            </GBtn>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Lightbox ---------- */

export function Lightbox() {
  const { lightbox, setLightbox } = useTalkStore();
  if (!lightbox) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 tg-fade-in" onClick={() => setLightbox(null)} role="dialog">
      <button type="button" className="tg-call-btn absolute end-4 top-4 !h-10 !w-10" aria-label="close">
        <X className="size-5" />
      </button>
      {lightbox.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lightbox.src} alt={lightbox.caption ?? ""} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      ) : (
        <video src={lightbox.src} controls autoPlay className="max-h-full max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
      )}
      {lightbox.caption && <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/90">{lightbox.caption}</p>}
    </div>
  );
}

export type { Chat, User };
