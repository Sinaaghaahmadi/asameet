"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Camera, Contact2, FileUp, Image as ImageIcon, Loader2, Lock, MapPin, Mic, MoreHorizontal, Paperclip, Pencil, Send, Smile, Square, Trash2, Video, X, CornerUpLeft } from "lucide-react";
import { toast } from "sonner";
import { EMOJI_GROUPS, emojiList, pushRecentEmoji, recentEmoji } from "@/lib/talk/emoji";
import { blobToBase64, compressImage, MAX_UPLOAD_BYTES, VideoNoteRecorder, VoiceRecorder } from "@/lib/talk/media";
import { useLocale, useT } from "@/lib/i18n";
import { cn, formatDuration, toLocaleDigits } from "@/lib/utils";
import type { Message, MessageMeta, MessageType, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { GBtn, TalkAvatar } from "./glass";
import { STICKER_PACK, Sticker } from "./stickers";

export interface OutgoingMessage {
  content: string;
  type: MessageType;
  blob?: Blob;
  mime?: string;
  meta?: MessageMeta;
}

export function Composer({
  chatId,
  replyTo,
  editing,
  users,
  onSend,
  onEdit,
  onCancelReply,
  onCancelEdit,
  onTyping,
  disabled,
  chatType,
}: {
  chatId: string;
  replyTo: Message | null;
  editing: Message | null;
  users: Map<string, User>;
  onSend: (m: OutgoingMessage) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onTyping: () => void;
  disabled?: boolean;
  chatType?: "private" | "group" | "channel";
}) {
  const t = useT();
  const { locale } = useLocale();
  const { drafts, setDraft, settings } = useTalkStore();
  const [text, setText] = useState(drafts[chatId] ?? "");
  const [picker, setPicker] = useState<null | "emoji" | "sticker">(null);
  const [recording, setRecording] = useState<null | "voice" | "video">(null);
  const [locked, setLocked] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [pending, setPending] = useState<{ blob: Blob; mime: string; kind: "image" | "video" | "file"; name: string; preview?: string; width?: number; height?: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [attach, setAttach] = useState(false);
  const [poll, setPoll] = useState(false);
  const [contactPick, setContactPick] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mention, setMention] = useState<{ q: string; start: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const voice = useRef<VoiceRecorder | null>(null);
  const videoRec = useRef<VideoNoteRecorder | null>(null);
  const videoPreview = useRef<HTMLVideoElement>(null);
  const lastTyping = useRef(0);
  const cancelDrag = useRef(false);

  // Draft per chat; editing pre-fills the field.
  useEffect(() => {
    setText(drafts[chatId] ?? "");
    setPicker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  useEffect(() => {
    if (editing) {
      setText(editing.content);
      area.current?.focus();
    }
  }, [editing]);
  useEffect(() => {
    if (replyTo) area.current?.focus();
  }, [replyTo]);

  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, []);
  useEffect(grow, [text, grow]);

  function change(v: string) {
    setText(v);
    if (!editing) setDraft(chatId, v);
    if (chatType && chatType !== "private") {
      const caret = area.current?.selectionStart ?? v.length;
      const before = v.slice(0, caret);
      const m = /(?:^|\s)@([\w]*)$/.exec(before);
      setMention(m ? { q: m[1].toLowerCase(), start: caret - m[1].length - 1 } : null);
    } else setMention(null);
    const now = Date.now();
    if (v && now - lastTyping.current > 2500) {
      lastTyping.current = now;
      onTyping();
    }
  }

  async function submitText() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if (editing) {
        await onEdit(editing.id, value);
        onCancelEdit();
      } else {
        await onSend({ content: value, type: "text" });
      }
      setText("");
      setDraft(chatId, "");
    } finally {
      setBusy(false);
      area.current?.focus();
    }
  }

  function insertEmoji(e: string) {
    pushRecentEmoji(e);
    const el = area.current;
    if (!el) return change(text + e);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + e + text.slice(end);
    change(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + e.length;
    });
  }

  async function sendSticker(id: string) {
    setPicker(null);
    await onSend({ content: id, type: "sticker", meta: { sticker: id } });
  }

  function insertMention(u: User) {
    if (!mention) return;
    const caret = area.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, mention.start)}@${u.username} ${text.slice(caret)}`;
    setMention(null);
    change(next);
    requestAnimationFrame(() => area.current?.focus());
  }

  async function shareLocation() {
    if (!("geolocation" in navigator)) return toast.error(t("talk.conv.locationDenied"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        setAttach(false);
        await onSend({ content: t("talk.conv.myLocation"), type: "location", meta: { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) } });
      },
      () => {
        setLocating(false);
        toast.error(t("talk.conv.locationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function pickFiles(files: FileList | null, forceFile = false) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES * 1.4) return toast.error(t("talk.composer.tooLarge"));
    if (!forceFile && file.type.startsWith("image/")) {
      const { blob, width, height } = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES) return toast.error(t("talk.composer.tooLarge"));
      setPending({ blob, mime: "image/jpeg", kind: "image", name: file.name, preview: URL.createObjectURL(blob), width, height });
    } else if (!forceFile && file.type.startsWith("video/")) {
      if (file.size > MAX_UPLOAD_BYTES) return toast.error(t("talk.composer.tooLarge"));
      setPending({ blob: file, mime: file.type, kind: "video", name: file.name, preview: URL.createObjectURL(file) });
    } else {
      if (file.size > MAX_UPLOAD_BYTES) return toast.error(t("talk.composer.tooLarge"));
      setPending({ blob: file, mime: file.type || "application/octet-stream", kind: "file", name: file.name });
    }
    setCaption("");
  }

  async function sendPending() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await onSend({
        content: caption.trim(),
        type: pending.kind,
        blob: pending.blob,
        mime: pending.mime,
        meta: pending.kind === "file" ? { fileName: pending.name, fileSize: pending.blob.size } : { width: pending.width, height: pending.height },
      });
      if (pending.preview) URL.revokeObjectURL(pending.preview);
      setPending(null);
      setCaption("");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- voice recording ---------- */
  async function startVoice() {
    if (recording) return;
    try {
      const rec = new VoiceRecorder();
      rec.onLevel = setLevel;
      await rec.start();
      voice.current = rec;
      setRecording("voice");
      setLocked(false);
      setRecSeconds(0);
      cancelDrag.current = false;
    } catch {
      toast.error(t("talk.composer.micDenied"));
    }
  }
  async function stopVoice(send: boolean) {
    const rec = voice.current;
    voice.current = null;
    setRecording(null);
    setLocked(false);
    setLevel(0);
    if (!rec) return;
    if (!send) return rec.cancel();
    const out = await rec.stop();
    if (out.duration < 1 || out.blob.size < 1000) return;
    if (out.blob.size > MAX_UPLOAD_BYTES) return toast.error(t("talk.composer.tooLarge"));
    await onSend({ content: "", type: "voice", blob: out.blob, mime: out.mime, meta: { duration: out.duration, waveform: out.waveform } });
  }

  /* ---------- video note ---------- */
  async function startVideo() {
    if (recording) return;
    try {
      const rec = new VideoNoteRecorder();
      const stream = await rec.start();
      videoRec.current = rec;
      setRecording("video");
      setLocked(true);
      setRecSeconds(0);
      requestAnimationFrame(() => {
        if (videoPreview.current) videoPreview.current.srcObject = stream;
      });
    } catch {
      toast.error(t("talk.composer.camDenied"));
    }
  }
  async function stopVideo(send: boolean) {
    const rec = videoRec.current;
    videoRec.current = null;
    setRecording(null);
    setLocked(false);
    if (!rec) return;
    if (!send) return rec.cancel();
    const out = await rec.stop();
    if (out.blob.size > MAX_UPLOAD_BYTES) return toast.error(t("talk.composer.tooLarge"));
    await onSend({ content: "", type: "video_note", blob: out.blob, mime: out.mime, meta: { duration: out.duration } });
  }

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setRecSeconds((s) => {
        if (recording === "video" && s + 1 >= 60) void stopVideo(true);
        if (recording === "voice" && s + 1 >= 600) void stopVoice(true);
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const [videoMode, setVideoMode] = useState(false);
  const hasText = text.trim().length > 0;

  const quoted = replyTo ?? editing;
  const mentionHits = mention ? Array.from(users.values()).filter((u) => u.username.toLowerCase().startsWith(mention.q) || u.displayName.toLowerCase().includes(mention.q)).slice(0, 5) : [];

  return (
    <div className="tg-safe-bottom relative px-2 pb-2 pt-1 md:px-4">
      {/* pending media dialog */}
      <AnimatePresence>
        {pending && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="tg-glass-strong mb-2 rounded-2xl p-3">
            <div className="flex items-start gap-3">
              {pending.kind === "image" && pending.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.preview} alt="" className="max-h-48 rounded-xl object-cover" />
              ) : pending.kind === "video" && pending.preview ? (
                <video src={pending.preview} className="max-h-48 rounded-xl" controls muted />
              ) : (
                <span className="tg-play !rounded-2xl">
                  <FileUp className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{pending.name}</p>
                <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("talk.msg.caption")} className="tg-input mt-2 h-10 py-0 text-sm" />
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <GBtn variant="ghost" size="sm" onClick={() => setPending(null)}>
                {t("talk.msg.cancel")}
              </GBtn>
              <GBtn variant="primary" size="sm" onClick={() => void sendPending()} disabled={busy}>
                <Send className="size-4 rtl:-scale-x-100" /> {t("talk.msg.send")}
              </GBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* emoji / sticker picker */}
      <AnimatePresence>
        {picker && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className="tg-glass-strong mb-2 overflow-hidden rounded-2xl">
            <div className="flex items-center gap-1 border-b tg-line px-2 py-1.5">
              <button type="button" className="tg-chip" data-active={picker === "emoji"} onClick={() => setPicker("emoji")}>
                😀 {t("talk.composer.emoji")}
              </button>
              <button type="button" className="tg-chip" data-active={picker === "sticker"} onClick={() => setPicker("sticker")}>
                ✨ {t("talk.composer.stickers")}
              </button>
              <span className="flex-1" />
              <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-8 !w-8" onClick={() => setPicker(null)} aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>
            {picker === "emoji" ? <EmojiGrid onPick={insertEmoji} /> : (
              <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto p-2 sm:grid-cols-6">
                {STICKER_PACK.map((s) => (
                  <button key={s.id} type="button" className="tg-ripple rounded-2xl p-1 transition hover:scale-105 hover:bg-[oklch(0.5_0.06_var(--talk-h)/0.1)]" onClick={() => void sendSticker(s.id)} title={t(`talk.stickers.${s.id}`)}>
                    <Sticker id={s.id} size={90} animate={false} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* attach sheet */}
      {attach && (
        <>
          <div className="tg-sheet-backdrop" onClick={() => setAttach(false)} />
          <div className="tg-sheet tg-glass-strong !gap-2">
            <span className="tg-sheet-handle" />
            <div className="tg-attach-grid">
              <AttachItem tint="oklch(0.62 0.17 240)" icon={<ImageIcon />} label={t("talk.conv.gallery")} onClick={() => { setAttach(false); mediaInput.current?.click(); }} />
              <AttachItem tint="oklch(0.6 0.2 295)" icon={<FileUp />} label={t("talk.conv.file")} onClick={() => { setAttach(false); fileInput.current?.click(); }} />
              <AttachItem tint="oklch(0.65 0.2 350)" icon={<Camera />} label={t("talk.conv.camera")} onClick={() => { setAttach(false); cameraInput.current?.click(); }} />
              <AttachItem tint="oklch(0.65 0.17 150)" icon={locating ? <Loader2 className="animate-spin" /> : <MapPin />} label={t("talk.conv.location")} onClick={() => void shareLocation()} />
              <AttachItem tint="oklch(0.75 0.16 70)" icon={<Contact2 />} label={t("talk.conv.contact")} onClick={() => { setAttach(false); setContactPick(true); }} />
              <AttachItem tint="oklch(0.7 0.14 220)" icon={<BarChart3 />} label={t("talk.conv.poll")} onClick={() => { setAttach(false); setPoll(true); }} />
              <AttachItem tint="oklch(0.6 0.22 25)" icon={<Video />} label={t("talk.conv.video")} onClick={() => { setAttach(false); void startVideo(); }} />
              <AttachItem tint="oklch(0.6 0.02 250)" icon={<MoreHorizontal />} label={t("talk.conv.more")} onClick={() => { setAttach(false); setPicker("sticker"); }} />
            </div>
          </div>
        </>
      )}
      {poll && (
        <PollComposer
          onClose={() => setPoll(false)}
          onCreate={async (q, options, multi) => {
            setPoll(false);
            await onSend({ content: q, type: "poll", meta: { options, multi } });
          }}
        />
      )}
      {contactPick && (
        <ContactPicker
          users={users}
          onClose={() => setContactPick(false)}
          onPick={async (u) => {
            setContactPick(false);
            await onSend({ content: u.displayName, type: "contact", meta: { userId: u.id } });
          }}
        />
      )}

      <div className="relative flex items-end gap-2">
        {/* @mention autocomplete */}
        {mention && mentionHits.length > 0 && (
          <div className="tg-mention-menu tg-glass-strong rounded-2xl p-1">
            {mentionHits.map((u) => (
              <button key={u.id} type="button" className="tg-row !py-1.5" onClick={() => insertMention(u)}>
                <TalkAvatar name={u.displayName} src={u.avatar} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{u.displayName}</span>
                  <span className="tg-muted block truncate text-[11px]" dir="ltr">
                    @{u.username}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="tg-composer min-w-0 flex-1">
          {quoted && (
            <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border-s-[3px] border-[var(--talk)] bg-[oklch(0.62_0.16_var(--talk-h)/0.08)] px-2.5 py-1.5 text-xs">
              {editing ? <Pencil className="size-4 shrink-0 text-[var(--talk)]" /> : <CornerUpLeft className="size-4 shrink-0 text-[var(--talk)]" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--talk)]">{editing ? t("talk.msg.editing") : `${t("talk.msg.replyingTo")} ${users.get(quoted.senderId)?.displayName ?? ""}`}</p>
                <p className="tg-muted truncate">{quoted.type === "text" ? quoted.content : t(`talk.msg.${quoted.type === "video_note" ? "videoNote" : quoted.type === "image" ? "photo" : quoted.type}`)}</p>
              </div>
              <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-7 !w-7" onClick={editing ? onCancelEdit : onCancelReply} aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>
          )}

          {recording ? (
            <div className="flex h-12 items-center gap-3 px-3">
              <span className="tg-record-dot" />
              <span className="w-12 text-[14px] font-bold tabular-nums" dir="ltr">
                {toLocaleDigits(formatDuration(recSeconds), locale)}
              </span>
              {recording === "video" && (
                <div className="tg-video-note !h-24 !w-24">
                  <video ref={videoPreview} autoPlay muted playsInline className="-scale-x-100" />
                </div>
              )}
              <span className="tg-muted flex-1 truncate text-center text-xs">{locked ? t("talk.composer.lockHint") : `‹ ${t("talk.composer.slideToCancel")}`}</span>
              <button type="button" className="tg-btn tg-btn-ghost tg-icon" onClick={() => void (recording === "voice" ? stopVoice(false) : stopVideo(false))} aria-label={t("talk.msg.cancel")}>
                <Trash2 className="size-5 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-0.5 px-1">
              <GBtn variant="ghost" size="icon" onClick={() => setPicker((p) => (p ? null : "emoji"))} aria-label={t("talk.composer.emoji")} className={cn(picker && "text-[var(--talk)]")}>
                <Smile className="size-[22px]" />
              </GBtn>
              <textarea
                ref={area}
                value={text}
                rows={1}
                disabled={disabled}
                onChange={(e) => change(e.target.value)}
                onKeyDown={(e) => {
                  if (mention && mentionHits.length && (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey))) {
                    e.preventDefault();
                    insertMention(mentionHits[0]);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey && (settings.sendOnEnter ? !e.ctrlKey : e.ctrlKey)) {
                    e.preventDefault();
                    void submitText();
                  }
                  if (e.key === "Escape") {
                    if (mention) setMention(null);
                    else if (editing || replyTo) (editing ? onCancelEdit : onCancelReply)();
                  }
                }}
                onPaste={(e) => {
                  const file = Array.from(e.clipboardData.files)[0];
                  if (file) {
                    e.preventDefault();
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    void pickFiles(dt.files);
                  }
                }}
                placeholder={disabled ? t("talk.chat.broadcast") : t("talk.composer.placeholder")}
                className="tg-textarea"
                aria-label={t("talk.composer.placeholder")}
              />
              <GBtn variant="ghost" size="icon" aria-label={t("talk.composer.attach")} onClick={() => setAttach(true)}>
                <Paperclip className="size-[22px]" />
              </GBtn>
              <input ref={mediaInput} type="file" accept="image/*,video/*" hidden onChange={(e) => void pickFiles(e.target.files).then(() => (e.target.value = ""))} />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pickFiles(e.target.files).then(() => (e.target.value = ""))} />
              <input ref={fileInput} type="file" hidden onChange={(e) => void pickFiles(e.target.files, true).then(() => (e.target.value = ""))} />
            </div>
          )}
        </div>

        {/* main action button: 48px round primary */}
        <div className="relative shrink-0">
          {recording === "voice" && !locked && <span className="tg-mic-ring" style={{ ["--level" as string]: 1 + level * 0.8 }} />}
          {hasText || editing ? (
            <GBtn variant="primary" size="fab" className="!size-12" onClick={() => void submitText()} disabled={busy} aria-label={t("talk.msg.send")}>
              {editing ? <Pencil className="size-5" /> : <Send className="size-5 rtl:-scale-x-100" />}
            </GBtn>
          ) : recording ? (
            <GBtn variant="primary" size="fab" className="!size-12" onClick={() => void (recording === "voice" ? stopVoice(true) : stopVideo(true))} aria-label={t("talk.msg.send")}>
              {locked ? <Send className="size-5 rtl:-scale-x-100" /> : <Square className="size-5" />}
            </GBtn>
          ) : (
            <GBtn
              variant="primary"
              size="fab"
              className="!size-12"
              disabled={disabled}
              aria-label={videoMode ? t("talk.composer.videoNote") : t("talk.composer.record")}
              title={t("talk.composer.holdToRecord")}
              onClick={() => {
                if (videoMode) void startVideo();
                else if (!recording) void startVoice();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setVideoMode((v) => !v);
              }}
              onDoubleClick={() => setVideoMode((v) => !v)}
            >
              {videoMode ? <Video className="size-5" /> : <Mic className="size-5" />}
            </GBtn>
          )}
          {recording === "voice" && !locked && (
            <button type="button" className="tg-btn absolute -top-12 start-1/2 -translate-x-1/2 !h-9 !w-9 rtl:translate-x-1/2" onClick={() => setLocked(true)} aria-label="lock">
              <Lock className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachItem({ tint, icon, label, onClick }: { tint: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <span className="tg-item-icon [&_svg]:size-6" style={{ background: tint }}>
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function PollComposer({ onClose, onCreate }: { onClose: () => void; onCreate: (q: string, options: string[], multi: boolean) => Promise<void> }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const valid = q.trim().length > 0 && opts.filter((o) => o.trim()).length >= 2;
  return (
    <>
      <div className="tg-sheet-backdrop" onClick={onClose} />
      <div className="tg-sheet tg-glass-strong !items-stretch !text-start">
        <span className="tg-sheet-handle self-center" />
        <h2 className="flex items-center gap-2 text-[18px] font-black">
          <BarChart3 className="size-5 text-[var(--talk)]" /> {t("talk.msg.poll")}
        </h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("talk.msg.question")} className="tg-input" autoFocus maxLength={200} />
        <div className="grid gap-2">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={o} onChange={(e) => setOpts((a) => a.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`${t("talk.msg.option")} ${i + 1}`} className="tg-input flex-1" maxLength={100} />
              {opts.length > 2 && (
                <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-9 !w-9" onClick={() => setOpts((a) => a.filter((_, j) => j !== i))} aria-label={t("common.close")}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {opts.length < 10 && (
            <button type="button" className="text-start text-sm font-semibold text-[var(--talk)]" onClick={() => setOpts((a) => [...a, ""])}>
              + {t("talk.msg.addOption")}
            </button>
          )}
        </div>
        <label className="flex items-center justify-between text-sm">
          <span>{t("talk.msg.multiPoll")}</span>
          <button type="button" role="switch" aria-checked={multi} data-on={multi} className="tg-switch" onClick={() => setMulti((v) => !v)} />
        </label>
        <GBtn variant="primary" size="lg" disabled={!valid} onClick={() => void onCreate(q.trim(), opts.map((o) => o.trim()).filter(Boolean), multi)}>
          {t("talk.msg.create")}
        </GBtn>
      </div>
    </>
  );
}

function ContactPicker({ users, onClose, onPick }: { users: Map<string, User>; onClose: () => void; onPick: (u: User) => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const list = Array.from(users.values()).filter((u) => !q || u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase()));
  return (
    <>
      <div className="tg-sheet-backdrop" onClick={onClose} />
      <div className="tg-sheet tg-glass-strong !items-stretch !text-start">
        <span className="tg-sheet-handle self-center" />
        <h2 className="text-[18px] font-black">{t("talk.msg.contact")}</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("talk.list.search")} className="tg-input" autoFocus />
        <div className="max-h-64 overflow-y-auto">
          {list.map((u) => (
            <button key={u.id} type="button" className="tg-row" onClick={() => onPick(u)}>
              <TalkAvatar name={u.displayName} src={u.avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{u.displayName}</span>
                <span className="tg-muted block truncate text-xs" dir="ltr">
                  @{u.username}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function EmojiGrid({ onPick }: { onPick: (e: string) => void }) {
  const t = useT();
  const [group, setGroup] = useState<string>(() => (recentEmoji().length ? "recent" : "smileys"));
  const list = group === "recent" ? recentEmoji() : emojiList(group);
  return (
    <div>
      <div className="no-scrollbar flex gap-0.5 overflow-x-auto border-b tg-line px-2 py-1">
        <button type="button" className="tg-chip !px-2" data-active={group === "recent"} onClick={() => setGroup("recent")} title={t("talk.composer.recent")}>
          🕘
        </button>
        {EMOJI_GROUPS.map((g) => (
          <button key={g.key} type="button" className="tg-chip !px-2 text-base" data-active={group === g.key} onClick={() => setGroup(g.key)}>
            {g.icon}
          </button>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-2 sm:grid-cols-10">
        {list.map((e, i) => (
          <button key={`${e}-${i}`} type="button" className="rounded-lg p-1 text-2xl leading-none transition hover:scale-125 hover:bg-[oklch(0.5_0.06_var(--talk-h)/0.12)]" onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
        {list.length === 0 && <p className="tg-muted col-span-full p-4 text-center text-xs">{t("common.empty")}</p>}
      </div>
    </div>
  );
}

export { blobToBase64 };
