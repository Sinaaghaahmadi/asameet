"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, CornerUpLeft, Copy, Download, FileText, Forward, Pencil, Pin, PinOff, Play, Pause, Phone, PhoneMissed, PhoneOutgoing, SquareCheck, Trash2, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/talk/api";
import { QUICK_REACTIONS } from "@/lib/talk/emoji";
import { isOnlyEmoji } from "@/lib/talk/emoji";
import { formatBytes } from "@/lib/talk/media";
import { splitLinks, systemText } from "@/lib/talk/format";
import { useLocale, useT } from "@/lib/i18n";
import { cn, formatDuration, formatTime, toLocaleDigits } from "@/lib/utils";
import type { Chat, Message, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { GMenu, GMenuContent, GMenuItem, GMenuSeparator, GMenuTrigger, TalkAvatar } from "./glass";
import { Sticker } from "./stickers";

export interface BubbleActions {
  reply: (m: Message) => void;
  edit: (m: Message) => void;
  forward: (m: Message) => void;
  react: (m: Message, emoji: string) => void;
  pin: (m: Message) => void;
  remove: (m: Message) => void;
  select: (m: Message) => void;
  jumpTo: (id: string) => void;
}

export function MessageBubble({
  msg,
  chat,
  me,
  users,
  repliedTo,
  showSender,
  tail,
  selected,
  actions,
  canPin,
}: {
  msg: Message;
  chat: Chat;
  me: User;
  users: Map<string, User>;
  repliedTo: Message | null;
  showSender: boolean;
  tail: boolean;
  selected: boolean;
  actions: BubbleActions;
  canPin: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const setLightbox = useTalkStore((s) => s.setLightbox);
  const own = msg.senderId === me.id;
  const sender = users.get(msg.senderId);
  const editable = own && ["text", "image", "file", "video"].includes(msg.type);
  const deletable = own || chat.myRole === "owner" || chat.myRole === "admin" || me.role === "admin";
  const isMedia = msg.type === "image" || msg.type === "video";
  const isSticker = msg.type === "sticker" || (msg.type === "text" && isOnlyEmoji(msg.content));
  const time = formatTime(msg.createdAt, locale);
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = (
    <span className={cn("tg-meta", isMedia && !msg.content && "tg-meta-overlay")}>
      {msg.editedAt && <span>{t("talk.msg.edited")}</span>}
      <span>{time}</span>
      {own && (msg.isRead ? <CheckCheck className="size-3.5 text-[oklch(0.62_0.16_var(--talk-h))]" /> : <Check className="size-3.5" />)}
    </span>
  );

  const body = (() => {
    switch (msg.type) {
      case "sticker":
        return <Sticker id={msg.meta?.sticker ?? msg.content} size={170} />;
      case "image":
        return (
          <div>
            <button
              type="button"
              className="block overflow-hidden rounded-[12px]"
              onClick={() => setLightbox({ src: mediaUrl(msg.mediaId!), kind: "image", caption: msg.content })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(msg.mediaId!)}
                alt={msg.content || t("talk.msg.photo")}
                className="max-h-[360px] w-auto max-w-full object-cover"
                style={{ aspectRatio: msg.meta?.width && msg.meta?.height ? `${msg.meta.width}/${msg.meta.height}` : undefined }}
                loading="lazy"
              />
            </button>
            {msg.content && <p className="whitespace-pre-wrap px-1.5 pt-1.5">{linkify(msg.content)}</p>}
          </div>
        );
      case "video":
        return (
          <div>
            <video src={mediaUrl(msg.mediaId!)} controls preload="metadata" className="max-h-[360px] max-w-full rounded-[12px]" />
            {msg.content && <p className="whitespace-pre-wrap px-1.5 pt-1.5">{linkify(msg.content)}</p>}
          </div>
        );
      case "video_note":
        return <VideoNote src={mediaUrl(msg.mediaId!)} duration={msg.meta?.duration} />;
      case "voice":
        return <VoicePlayer src={mediaUrl(msg.mediaId!)} duration={msg.meta?.duration ?? 0} waveform={msg.meta?.waveform ?? []} own={own} />;
      case "file":
        return (
          <a href={mediaUrl(msg.mediaId!)} download={msg.meta?.fileName ?? "file"} className="flex items-center gap-3 py-1 pe-2">
            <span className="tg-play !rounded-2xl">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{msg.meta?.fileName ?? t("talk.msg.file")}</span>
              <span className="block text-xs opacity-70">
                {msg.meta?.fileSize ? formatBytes(msg.meta.fileSize) : ""} · <Download className="inline size-3" /> {t("talk.msg.download")}
              </span>
            </span>
          </a>
        );
      case "call":
        return (
          <span className="flex items-center gap-2 py-1">
            {msg.meta?.missed ? <PhoneMissed className="size-4 text-red-500" /> : own ? <PhoneOutgoing className="size-4" /> : <Phone className="size-4" />}
            <span className="text-sm">{msg.content}</span>
          </span>
        );
      default:
        return <p className={cn("whitespace-pre-wrap", isSticker && "tg-emoji-big")}>{linkify(msg.content)}</p>;
    }
  })();

  if (msg.type === "system") {
    const who = users.get(msg.senderId)?.displayName;
    const target = msg.meta?.userId ? users.get(msg.meta.userId)?.displayName : undefined;
    return (
      <div className="flex justify-center py-1.5">
        <span className="tg-system-chip">
          {systemText(msg.content, who, t)}
          {target ? ` ${target}` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("group relative flex items-end gap-1.5 px-2", own ? "flex-row-reverse" : "flex-row", selected && "rounded-xl bg-[oklch(0.62_0.16_var(--talk-h)/0.12)]")}
      data-message-id={msg.id}
    >
      {!own && chat.type !== "private" && (
        <span className="w-8 shrink-0">{tail && <TalkAvatar name={sender?.displayName ?? "?"} src={sender?.avatar} size="xs" />}</span>
      )}
      <GMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="relative max-w-full">
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
            className={cn(
              "tg-bubble",
              own ? "tg-bubble-out" : "tg-bubble-in",
              tail && "tg-tail",
              isMedia && "tg-bubble-media",
              (msg.type === "sticker" || msg.type === "video_note") && "tg-bubble-sticker"
            )}
            onDoubleClick={() => actions.reply(msg)}
          >
            {msg.forwardedFrom && (
              <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                <Forward className="me-1 inline size-3" />
                {t("talk.msg.forwardedFrom")} {msg.forwardedFrom}
              </p>
            )}
            {showSender && !own && chat.type !== "private" && msg.type !== "sticker" && (
              <p className="tg-sender" style={{ color: `oklch(0.55 0.17 ${hueOf(sender?.id ?? "")})` }}>
                {sender?.displayName}
              </p>
            )}
            {repliedTo && (
              <button type="button" className="tg-quote w-full text-start" onClick={() => actions.jumpTo(repliedTo.id)}>
                <span className="block truncate font-bold">{users.get(repliedTo.senderId)?.displayName}</span>
                <span className="block truncate opacity-80">{repliedTo.type === "text" ? repliedTo.content : `${t(`talk.msg.${previewKey(repliedTo.type)}`)}`}</span>
              </button>
            )}
            {body}
            {msg.type !== "sticker" && msg.type !== "video_note" && meta}
          </div>
          {(msg.type === "sticker" || msg.type === "video_note") && (
            <span className={cn("absolute bottom-1 text-[10px] opacity-70", own ? "start-1" : "end-1")}>
              {time} {own && (msg.isRead ? <CheckCheck className="inline size-3" /> : <Check className="inline size-3" />)}
            </span>
          )}
          {msg.reactions.length > 0 && (
            <div className={cn("mt-1 flex flex-wrap gap-1", own ? "justify-end" : "justify-start")}>
              {msg.reactions.map((r) => (
                <button key={r.emoji} type="button" className="tg-reaction" data-mine={r.userIds.includes(me.id)} onClick={() => actions.react(msg, r.emoji)}>
                  <span>{r.emoji}</span>
                  {r.userIds.length > 1 && <span className="text-[11px] font-bold">{toLocaleDigits(r.userIds.length, locale)}</span>}
                </button>
              ))}
            </div>
          )}
          {/* hover affordance (desktop); long-press / right-click opens the same menu */}
          <div
            className={cn(
              "absolute top-1 flex gap-0.5 opacity-0 transition-opacity md:group-hover:opacity-100",
              menuOpen && "opacity-100",
              own ? "-start-16 flex-row-reverse" : "-end-16"
            )}
          >
            <button type="button" className="tg-btn tg-icon !h-7 !w-7" onClick={() => actions.reply(msg)} aria-label={t("talk.msg.reply")} tabIndex={-1}>
              <CornerUpLeft className="size-3.5" />
            </button>
            <GMenuTrigger asChild>
              <button type="button" className="tg-btn tg-icon !h-7 !w-7" aria-label={t("talk.msg.react")} tabIndex={-1}>
                <SmilePlus className="size-3.5" />
              </button>
            </GMenuTrigger>
          </div>
        </div>
        <GMenuContent align={own ? "end" : "start"} className="max-w-[92vw]">
          <div className="mb-1 flex max-w-[280px] flex-wrap gap-0.5 px-1">
            {QUICK_REACTIONS.slice(0, 8).map((e) => (
              <GMenuItem key={e} className="!p-1 text-xl hover:scale-125" onSelect={() => actions.react(msg, e)}>
                {e}
              </GMenuItem>
            ))}
          </div>
          <GMenuSeparator />
          <GMenuItem onSelect={() => actions.reply(msg)}>
            <CornerUpLeft /> {t("talk.msg.reply")}
          </GMenuItem>
          {msg.type === "text" && (
            <GMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(msg.content);
                toast.success(t("talk.msg.copied"));
              }}
            >
              <Copy /> {t("talk.msg.copy")}
            </GMenuItem>
          )}
          <GMenuItem onSelect={() => actions.forward(msg)}>
            <Forward /> {t("talk.msg.forward")}
          </GMenuItem>
          {editable && (
            <GMenuItem onSelect={() => actions.edit(msg)}>
              <Pencil /> {t("talk.msg.edit")}
            </GMenuItem>
          )}
          {canPin && (
            <GMenuItem onSelect={() => actions.pin(msg)}>
              {msg.isPinned ? <PinOff /> : <Pin />} {msg.isPinned ? t("talk.msg.unpin") : t("talk.msg.pin")}
            </GMenuItem>
          )}
          <GMenuItem onSelect={() => actions.select(msg)}>
            <SquareCheck /> {t("talk.msg.select")}
          </GMenuItem>
          {msg.mediaId && (
            <GMenuItem asChild>
              <a href={mediaUrl(msg.mediaId)} download>
                <Download /> {t("talk.msg.download")}
              </a>
            </GMenuItem>
          )}
          {deletable && (
            <>
              <GMenuSeparator />
              <GMenuItem danger onSelect={() => actions.remove(msg)}>
                <Trash2 /> {t("talk.msg.delete")}
              </GMenuItem>
            </>
          )}
        </GMenuContent>
      </GMenu>
    </div>
  );
}

function previewKey(type: Message["type"]): string {
  return type === "video_note" ? "videoNote" : type === "image" ? "photo" : type;
}

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function linkify(text: string) {
  const parts = splitLinks(text);
  if (parts.length === 1 && !parts[0].href) return text;
  return parts.map((p, i) =>
    p.href ? (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
        {p.text}
      </a>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

/* ---------- Voice player with waveform ---------- */

export function VoicePlayer({ src, duration, waveform, own }: { src: string; duration: number; waveform: number[]; own: boolean }) {
  const { locale } = useLocale();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [rate, setRate] = useState(1);
  const bars = useMemo(() => (waveform.length ? waveform : Array.from({ length: 40 }, (_, i) => 6 + ((i * 7) % 14))), [waveform]);
  const total = duration || audio.current?.duration || 0;

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setPos(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setPos(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.playbackRate = rate;
      void a.play();
      setPlaying(true);
    }
  }

  const progress = total ? pos / total : 0;
  return (
    <div className={cn("flex items-center gap-2.5 py-0.5 pe-1", own ? "text-[var(--talk-bubble-out-fg)]" : "text-[var(--talk-strong)]")}>
      <audio ref={audio} src={src} preload="metadata" />
      <button type="button" className="tg-play" onClick={toggle} aria-label={playing ? "pause" : "play"}>
        {playing ? <Pause className="size-5" /> : <Play className="size-5 ms-0.5" />}
      </button>
      <div className="min-w-[150px]">
        <div
          className="tg-wave"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - r.left) / r.width;
            const p = document.dir === "rtl" ? 1 - ratio : ratio;
            if (audio.current && total) audio.current.currentTime = p * total;
          }}
        >
          {bars.map((v, i) => (
            <span key={i} style={{ height: `${Math.max(3, (v / 31) * 26)}px` }} data-played={i / bars.length <= progress} />
          ))}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] opacity-75">
          <span>{toLocaleDigits(formatDuration(playing ? pos : total), locale)}</span>
          <button
            type="button"
            className="rounded-full bg-current/15 px-1.5 text-[10px] font-bold"
            onClick={() => {
              const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
              setRate(next);
              if (audio.current) audio.current.playbackRate = next;
            }}
          >
            {toLocaleDigits(`${next2(rate)}×`, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
const next2 = (r: number) => (r === 1 ? "1" : r === 1.5 ? "1.5" : "2");

/* ---------- Round video message ---------- */

function VideoNote({ src, duration }: { src: string; duration?: number }) {
  const { locale } = useLocale();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  return (
    <div className="relative">
      <div
        className="tg-video-note cursor-pointer"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) {
            v.muted = false;
            setMuted(false);
            void v.play();
            setPlaying(true);
          } else {
            v.pause();
            setPlaying(false);
          }
        }}
      >
        <video ref={ref} src={src} playsInline loop={false} muted={muted} preload="metadata" onEnded={() => setPlaying(false)} />
      </div>
      {!playing && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="tg-play !h-14 !w-14">
            <Play className="size-6 ms-0.5" />
          </span>
        </span>
      )}
      {duration ? <span className="tg-meta tg-meta-overlay !bottom-3 !inset-inline-end-auto !inset-inline-start-3">{toLocaleDigits(formatDuration(duration), locale)}</span> : null}
    </div>
  );
}
