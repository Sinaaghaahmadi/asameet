"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileUp, Image as ImageIcon, Lock, Mic, Paperclip, Pencil, Send, Smile, Square, Trash2, Video, X, CornerUpLeft } from "lucide-react";
import { toast } from "sonner";
import { EMOJI_GROUPS, emojiList, pushRecentEmoji, recentEmoji } from "@/lib/talk/emoji";
import { blobToBase64, compressImage, MAX_UPLOAD_BYTES, VideoNoteRecorder, VoiceRecorder } from "@/lib/talk/media";
import { useT } from "@/lib/i18n";
import { cn, formatDuration } from "@/lib/utils";
import type { Message, MessageMeta, MessageType, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { GBtn, GMenu, GMenuContent, GMenuItem, GMenuTrigger } from "./glass";
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
}) {
  const t = useT();
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
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
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

      <div className="flex items-end gap-2">
        <div className="tg-composer min-w-0 flex-1">
          {quoted && (
            <div className="flex items-center gap-2 border-b tg-line px-3 py-1.5 text-xs">
              {editing ? <Pencil className="size-4 text-[var(--talk)]" /> : <CornerUpLeft className="size-4 text-[var(--talk)]" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--talk)]">{editing ? t("talk.msg.editing") : users.get(quoted.senderId)?.displayName}</p>
                <p className="tg-muted truncate">{quoted.type === "text" ? quoted.content : t(`talk.msg.${quoted.type === "video_note" ? "videoNote" : quoted.type === "image" ? "photo" : quoted.type}`)}</p>
              </div>
              <button type="button" className="tg-btn tg-btn-ghost tg-icon !h-7 !w-7" onClick={editing ? onCancelEdit : onCancelReply} aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>
          )}

          {recording ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="tg-record-dot" />
              <span className="w-12 text-sm font-semibold tabular-nums">{formatDuration(recSeconds)}</span>
              {recording === "video" && (
                <div className="tg-video-note !h-28 !w-28">
                  <video ref={videoPreview} autoPlay muted playsInline className="-scale-x-100" />
                </div>
              )}
              <span className="tg-muted flex-1 text-xs">{locked ? t("talk.composer.lockHint") : t("talk.composer.slideToCancel")}</span>
              <button type="button" className="tg-btn tg-btn-ghost tg-icon" onClick={() => void (recording === "voice" ? stopVoice(false) : stopVideo(false))} aria-label={t("talk.msg.cancel")}>
                <Trash2 className="size-5 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-1 px-1.5">
              <GBtn variant="ghost" size="icon" onClick={() => setPicker((p) => (p ? null : "emoji"))} aria-label={t("talk.composer.emoji")} className={cn(picker && "text-[var(--talk)]")}>
                <Smile className="size-5" />
              </GBtn>
              <textarea
                ref={area}
                value={text}
                rows={1}
                disabled={disabled}
                onChange={(e) => change(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && (settings.sendOnEnter ? !e.ctrlKey : e.ctrlKey)) {
                    e.preventDefault();
                    void submitText();
                  }
                  if (e.key === "Escape" && (editing || replyTo)) (editing ? onCancelEdit : onCancelReply)();
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
              <GMenu>
                <GMenuTrigger asChild>
                  <GBtn variant="ghost" size="icon" aria-label={t("talk.composer.attach")}>
                    <Paperclip className="size-5" />
                  </GBtn>
                </GMenuTrigger>
                <GMenuContent align="end" side="top">
                  <GMenuItem onSelect={() => mediaInput.current?.click()}>
                    <ImageIcon /> {t("talk.composer.photo")}
                  </GMenuItem>
                  <GMenuItem onSelect={() => fileInput.current?.click()}>
                    <FileUp /> {t("talk.composer.file")}
                  </GMenuItem>
                  <GMenuItem onSelect={() => void startVideo()}>
                    <Camera /> {t("talk.composer.videoNote")}
                  </GMenuItem>
                </GMenuContent>
              </GMenu>
              <input ref={mediaInput} type="file" accept="image/*,video/*" hidden onChange={(e) => void pickFiles(e.target.files).then(() => (e.target.value = ""))} />
              <input ref={fileInput} type="file" hidden onChange={(e) => void pickFiles(e.target.files, true).then(() => (e.target.value = ""))} />
            </div>
          )}
        </div>

        {/* main action button */}
        <div className="relative">
          {recording === "voice" && !locked && <span className="tg-mic-ring" style={{ ["--level" as string]: 1 + level * 0.8 }} />}
          {hasText || editing ? (
            <GBtn variant="primary" size="fab" onClick={() => void submitText()} disabled={busy} aria-label={t("talk.msg.send")}>
              {editing ? <Pencil className="size-5" /> : <Send className="size-5 rtl:-scale-x-100" />}
            </GBtn>
          ) : recording ? (
            <GBtn variant="primary" size="fab" onClick={() => void (recording === "voice" ? stopVoice(true) : stopVideo(true))} aria-label={t("talk.msg.send")}>
              {locked ? <Send className="size-5 rtl:-scale-x-100" /> : <Square className="size-5" />}
            </GBtn>
          ) : (
            <GBtn
              variant="primary"
              size="fab"
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
