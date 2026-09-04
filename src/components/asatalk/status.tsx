"use client";

/** 24-hour notes (status strip + viewer + editor), per the design hand-off. */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { talkApi } from "@/lib/talk/api";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import type { User } from "@/lib/types";
import { GBtn, TalkAvatar, hueFor } from "./glass";
import { Mascot } from "./mascots";
import { useTalk } from "./talk-data";
import { useTalkStore } from "@/stores/talk-store";

const DAY = 24 * 60 * 60 * 1000;
const SEEN_KEY = "asatalk-notes-seen";

export function hasNote(u: User | undefined | null): u is User & { note: string; noteAt: string } {
  return !!u?.note && !!u.noteAt && Date.now() - new Date(u.noteAt).getTime() < DAY;
}

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}
function markSeen(u: User) {
  try {
    const s = readSeen();
    s[u.id] = u.noteAt ?? "";
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  } catch {}
}

export function noteAge(iso: string, t: (k: string) => string, locale: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return t("talk.home.justNow");
  if (mins < 60) return `${toLocaleDigits(mins, locale)} ${t("talk.home.minutesAgo")}`;
  return `${toLocaleDigits(Math.round(mins / 60), locale)} ${t("talk.home.hoursAgo")}`;
}

/* ---------- strip ---------- */
export function StatusStrip() {
  const t = useT();
  const { me, userList } = useTalk();
  const [viewing, setViewing] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [seenTick, setSeenTick] = useState(0);
  const withNotes = useMemo(() => userList.filter((u) => u.id !== me.id && hasNote(u)).sort((a, b) => (b.noteAt ?? "").localeCompare(a.noteAt ?? "")), [userList, me.id]);
  const seen = useMemo(() => (typeof window === "undefined" ? {} : readSeen()), [seenTick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-2 pt-3">
        <button type="button" className="flex w-[64px] shrink-0 flex-col items-center gap-1.5" onClick={() => setEditing(true)}>
          <span className="relative">
            {hasNote(me) ? (
              <span className="tg-status-ring">
                <TalkAvatar name={me.displayName} src={me.avatar} size="lg" className="!size-full border-2 border-[var(--talk-bg)]" />
              </span>
            ) : (
              <span className="tg-status-add">
                <Plus className="size-6" />
              </span>
            )}
            {hasNote(me) && <span className="tg-note-bubble tg-glass-strong">{me.note}</span>}
          </span>
          <span className="w-full truncate text-center text-[11px] font-semibold">{t("talk.home.yourStatus")}</span>
        </button>
        {withNotes.map((u) => (
          <button key={u.id} type="button" className="flex w-[64px] shrink-0 flex-col items-center gap-1.5" onClick={() => setViewing(u)}>
            <span className="relative">
              <span className="tg-status-ring" data-seen={seen[u.id] === u.noteAt}>
                <TalkAvatar name={u.displayName} src={u.avatar} size="lg" className="!size-full border-2 border-[var(--talk-bg)]" />
              </span>
              <span className="tg-note-bubble tg-glass-strong">{u.note}</span>
            </span>
            <span className="tg-muted w-full truncate text-center text-[11px] font-semibold">{u.displayName.split(" ")[0]}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {viewing && (
          <StatusViewer
            user={viewing}
            onClose={() => {
              markSeen(viewing);
              setSeenTick((v) => v + 1);
              setViewing(null);
            }}
          />
        )}
      </AnimatePresence>
      {editing && <NoteEditor onClose={() => setEditing(false)} />}
    </>
  );
}

/* ---------- viewer ---------- */
export function StatusViewer({ user, onClose }: { user: User; onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { openPrivateChat, showError } = useTalk();
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const hue = hueFor(user.id);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 7000);
      setProgress(p);
      if (p >= 1 && !reply) onClose();
    }, 50);
    return () => window.clearInterval(id);
  }, [onClose, reply]);

  async function send(text: string) {
    try {
      const chat = await openPrivateChat(user.id);
      await talkApi.send(chat.id, { content: text, meta: { statusReply: user.note ?? undefined } });
      toast.success(t("talk.chat.sent"));
      onClose();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="talk fixed inset-0 z-[70] flex flex-col text-white" style={{ background: `linear-gradient(160deg, oklch(0.55 0.18 ${hue}), oklch(0.35 0.16 ${(hue + 40) % 360}))` }} role="dialog" onClick={onClose}>
      <div className="tg-safe-top px-3 pt-3">
        <div className="h-[3px] overflow-hidden rounded-full bg-white/30">
          <div className="h-full bg-white transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <TalkAvatar name={user.displayName} src={user.avatar} size="sm" />
          <span className="text-[14px] font-bold">{user.displayName}</span>
          <span className="text-[12px] text-white/70">{user.noteAt ? noteAge(user.noteAt, t, locale) : ""}</span>
          <button type="button" className="ms-auto rounded-full p-2 hover:bg-white/15" aria-label={t("common.close")} onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-8 text-center">
        <p className="text-[26px] font-black leading-relaxed drop-shadow">{user.note}</p>
      </div>
      <div className="flex items-center gap-2 px-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("talk.home.replyToStatus")} className="tg-glass h-11 flex-1 rounded-full bg-white/15 px-4 text-[13.5px] text-white placeholder:text-white/70 outline-none" onKeyDown={(e) => e.key === "Enter" && reply.trim() && void send(reply.trim())} />
        {["❤️", "👏"].map((e) => (
          <button key={e} type="button" className="tg-glass flex size-11 items-center justify-center rounded-full text-[20px] transition hover:scale-110" onClick={() => void send(e)}>
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- editor ---------- */
export function NoteEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me } = useTalk();
  const [text, setText] = useState(hasNote(me) ? me.note : "");
  const [busy, setBusy] = useState(false);
  const setUser = useTalkStoreSetUser();

  async function save(clear?: boolean) {
    setBusy(true);
    try {
      const { user } = await talkApi.updateProfile(clear ? { clearNote: true } : { note: text.trim() });
      setUser(user);
      onClose();
    } catch {
      toast.error(t("talk.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="tg-sheet-backdrop" onClick={onClose} />
      <div className="tg-sheet tg-glass-strong">
        <span className="tg-sheet-handle" />
        <div className="relative">
          <TalkAvatar name={me.displayName} src={me.avatar} size="xl" />
          <span className={cn("tg-note-bubble tg-glass-strong !-top-4 !max-w-[160px]", !text && "opacity-40")}>{text || "…"}</span>
        </div>
        <h2 className="text-[18px] font-black">{t("talk.home.noteTitle")}</h2>
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} placeholder={t("talk.home.notePlaceholder")} className="tg-input w-full" autoFocus maxLength={60} />
        <p className="tg-hint">
          {t("talk.home.noteHint")} <span dir="ltr">{toLocaleDigits(text.length, locale)}/{toLocaleDigits(60, locale)}</span>
        </p>
        <GBtn variant="primary" size="lg" className="w-full" disabled={busy || !text.trim()} onClick={() => void save()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />} {t("talk.home.noteSave")}
        </GBtn>
        {hasNote(me) && (
          <button type="button" className="text-sm font-semibold text-red-500" onClick={() => void save(true)}>
            {t("talk.home.noteClear")}
          </button>
        )}
        <Mascot pose="love" size={80} className="absolute -top-10 end-6 hidden md:block" />
      </div>
    </>
  );
}

function useTalkStoreSetUser() {
  return useTalkStore((s) => s.setUser);
}
