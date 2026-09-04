"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  Phone,
  PhoneOff,
  ShieldCheck,
  SwitchCamera,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { cn, formatDuration, toLocaleDigits } from "@/lib/utils";
import type { User } from "@/lib/types";
import { Mascot } from "../mascots";
import { TalkAvatar } from "../glass";
import type { ActiveCall } from "./call-provider";

function VideoEl({ stream, muted, mirror, className }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={cn("h-full w-full object-cover", mirror && "-scale-x-100", className)} />;
}

function AudioEl({ stream, muted }: { stream: MediaStream | null; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.volume = muted ? 0.35 : 1;
  }, [muted]);
  return <audio ref={ref} autoPlay />;
}

export function CallScreen({
  state,
  me,
  onAccept,
  onDecline,
  onHangup,
  onMute,
  onCamera,
  onSwitchCamera,
  onScreen,
  onSpeaker,
  onMinimize,
  onMessage,
  onCallAgain,
}: {
  state: ActiveCall;
  me: User;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onMute: (m: boolean) => void;
  onCamera: (on: boolean) => void;
  onSwitchCamera: () => void;
  onScreen: (on: boolean) => void;
  onSpeaker: (on: boolean) => void;
  onMinimize: (m: boolean) => void;
  onMessage: () => void;
  onCallAgain: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [seconds, setSeconds] = useState(0);
  const incoming = !state.session.isCaller && state.phase === "ringing";
  const hasRemoteVideo = !!state.remote?.getVideoTracks().some((v) => v.readyState === "live") && (state.peerState.camera || state.peerState.screen);
  const hasLocalVideo = !!state.local?.getVideoTracks().some((v) => v.enabled);

  useEffect(() => {
    if (state.phase !== "connected") return;
    const id = window.setInterval(() => setSeconds(state.session.duration), 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.session]);

  const status = (() => {
    switch (state.phase) {
      case "ringing":
        return incoming ? (state.call.type === "video" ? t("talk.calls.incomingVideo") : t("talk.calls.incomingAudio")) : t("talk.calls.ringing");
      case "connecting":
        return t("talk.calls.connecting");
      case "connected":
        return toLocaleDigits(formatDuration(seconds), locale);
      case "ended":
        return state.reason === "declined"
          ? t("talk.calls.declinedMsg")
          : state.reason === "missed"
            ? t("talk.calls.noAnswer")
            : state.reason === "failed"
              ? t("talk.calls.failed")
              : t("talk.calls.ended");
    }
  })();

  const pipPos = useRef({ x: 16, y: 80 });
  const [pip, setPip] = useState(pipPos.current);

  if (state.minimized) {
    return (
      <div
        className="tg-pip talk"
        style={{ left: pip.x, top: pip.y }}
        onPointerDown={(e) => {
          const start = { x: e.clientX - pip.x, y: e.clientY - pip.y };
          const move = (ev: PointerEvent) => {
            const nx = Math.min(window.innerWidth - 160, Math.max(0, ev.clientX - start.x));
            const ny = Math.min(window.innerHeight - 200, Math.max(0, ev.clientY - start.y));
            pipPos.current = { x: nx, y: ny };
            setPip({ x: nx, y: ny });
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      >
        <div className="tg-call-bg relative h-full w-full">
          {hasRemoteVideo ? (
            <VideoEl stream={state.remote} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white">
              <TalkAvatar name={state.peer.displayName} src={state.peer.avatar} size="lg" />
              <span className="text-xs font-semibold">{status}</span>
            </div>
          )}
          <AudioEl stream={state.remote} muted={!state.speaker} />
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
            <button className="tg-call-btn !h-9 !w-9" onClick={() => onMinimize(false)} aria-label={t("talk.calls.expand")}>
              <Maximize2 className="size-4" />
            </button>
            <button className="tg-call-btn tg-call-end !h-9 !w-9" onClick={onHangup} aria-label={t("talk.calls.end")}>
              <PhoneOff className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="call"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className={cn("talk tg-call-bg fixed inset-0 z-[80] flex flex-col overflow-hidden text-white", state.phase === "ended" && "saturate-50")}
        role="dialog"
        aria-label={state.call.type === "video" ? t("talk.calls.videoCall") : t("talk.calls.audioCall")}
      >
        <AudioEl stream={state.remote} muted={!state.speaker} />

        {/* Remote video fills the stage */}
        {hasRemoteVideo && (
          <div className="absolute inset-0">
            <VideoEl stream={state.remote} className={state.peerState.screen ? "object-contain bg-black" : undefined} />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        )}

        {/* Top bar */}
        <div className="tg-safe-top relative z-10 flex items-start justify-between px-4 pt-3">
          {state.phase === "connected" ? (
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-black drop-shadow">{state.peer.displayName}</h2>
              <p className="mt-0.5 flex items-center gap-2 text-[12px] text-white/85">
                <span dir="ltr">{status}</span>
                <span className="tg-signal" aria-hidden>
                  {[5, 8, 11, 14].map((h) => (
                    <span key={h} className="w-[3px] rounded-sm bg-emerald-400" style={{ height: h }} />
                  ))}
                </span>
              </p>
            </div>
          ) : (
            <button className="tg-call-btn !h-10 !w-10" onClick={() => onMinimize(true)} aria-label={t("talk.calls.minimize")}>
              <Minimize2 className="size-4" />
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            <ShieldCheck className="size-3.5" /> {t("talk.calls.encrypted")}
          </span>
        </div>

        {/* Center */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-6">
          {state.phase === "ended" ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 text-center">
              <TalkAvatar name={state.peer.displayName} src={state.peer.avatar} size="xl" className="!size-[84px] !shadow-2xl grayscale-[0.5]" />
              <h2 className="text-[22px] font-black drop-shadow">{status}</h2>
              <p className="text-sm text-white/80">
                {state.peer.displayName}
                {seconds > 0 && (
                  <>
                    {" · "}
                    <span dir="ltr">{toLocaleDigits(formatDuration(seconds), locale)}</span>
                  </>
                )}
              </p>
              <Mascot pose={state.reason === "declined" || state.reason === "failed" ? "sad" : "wave"} size={110} />
            </motion.div>
          ) : (
            <>
              {!hasRemoteVideo && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                  {state.phase === "ringing" && (
                    <>
                      <span className="tg-call-ring" />
                      <span className="tg-call-ring" />
                      <span className="tg-call-ring" />
                    </>
                  )}
                  <TalkAvatar name={state.peer.displayName} src={state.peer.avatar} size="xxl" className="!size-[150px] !shadow-2xl" />
                </motion.div>
              )}
              {state.phase !== "connected" && (
                <div className="text-center">
                  <h2 className="text-[29px] font-black drop-shadow">{state.peer.displayName}</h2>
                  <p className="mt-1 text-[14px] text-white/85">{status}{state.phase === "ringing" ? "…" : ""}</p>
                </div>
              )}
              {state.phase === "connected" && state.peerState.muted && (
                <span className="absolute bottom-6 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] backdrop-blur">
                  <MicOff className="size-3.5" /> {t("talk.conv.peerMuted").replace("{name}", state.peer.displayName)}
                </span>
              )}
              {state.phase === "connected" && state.peerState.screen && <p className="absolute top-2 text-xs text-white/70">{t("talk.calls.peerSharing")}</p>}
              {state.phase === "ringing" && !hasRemoteVideo && (
                <div className="opacity-90">
                  <Mascot pose={state.call.type === "video" ? "video" : "phone"} size={140} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Local preview */}
        {hasLocalVideo && state.phase !== "ended" && (
          <motion.div drag dragMomentum={false} className="absolute start-[18px] top-24 z-20 h-40 w-28 overflow-hidden rounded-2xl border border-white/30 shadow-2xl">
            <VideoEl stream={state.local} muted mirror={!state.screen} />
          </motion.div>
        )}

        {/* Controls */}
        <div className="tg-safe-bottom relative z-10 shrink-0 px-6 pb-8">
          {incoming ? (
            <div className="flex flex-col items-center gap-6">
              <button type="button" className="tg-btn !rounded-full !bg-white/15 !text-white px-5 text-[13px]" onClick={onMessage}>
                <MessageCircle className="size-4" /> {t("talk.conv.replyWithMessage")}
              </button>
              <div className="flex items-start justify-center gap-16">
                <div className="flex flex-col items-center gap-2">
                  <button className="tg-call-btn tg-call-end !h-[68px] !w-[68px]" onClick={onDecline} aria-label={t("talk.calls.decline")}>
                    <PhoneOff className="size-7" />
                  </button>
                  <span className="text-xs">{t("talk.calls.decline")}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button className="tg-call-btn tg-call-accept tg-ring-shake !h-[68px] !w-[68px]" onClick={onAccept} aria-label={t("talk.calls.accept")}>
                    {state.call.type === "video" ? <Video className="size-7" /> : <Phone className="size-7" />}
                  </button>
                  <span className="text-xs">{t("talk.calls.accept")}</span>
                </div>
              </div>
            </div>
          ) : state.phase === "ended" ? (
            <div className="mx-auto flex max-w-xs gap-3">
              <button type="button" className="tg-btn tg-btn-primary h-12 flex-1 !rounded-full text-sm" onClick={onCallAgain}>
                {state.call.type === "video" ? <Video className="size-4" /> : <Phone className="size-4" />} {t("talk.conv.callAgain")}
              </button>
              <button type="button" className="tg-btn h-12 flex-1 !rounded-full !bg-white/15 !text-white text-sm" onClick={onMessage}>
                <MessageCircle className="size-4" /> {t("talk.conv.message")}
              </button>
            </div>
          ) : (
            <div className="mx-auto flex max-w-md items-center justify-center gap-3">
              <Ctl on={state.muted} onClick={() => onMute(!state.muted)} label={state.muted ? t("talk.calls.unmute") : t("talk.calls.mute")}>
                {state.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </Ctl>
              <Ctl on={!state.camera} onClick={() => void onCamera(!state.camera)} label={state.camera ? t("talk.calls.cameraOff") : t("talk.calls.cameraOn")}>
                {state.camera ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              </Ctl>
              <Ctl on={false} onClick={onSwitchCamera} label={t("talk.calls.switchCamera")} disabled={!state.camera}>
                <SwitchCamera className="size-5" />
              </Ctl>
              <Ctl on={state.screen} onClick={() => void onScreen(!state.screen)} label={state.screen ? t("talk.calls.stopShare") : t("talk.calls.shareScreen")} hideOnMobile>
                <MonitorUp className="size-5" />
              </Ctl>
              <Ctl on={!state.speaker} onClick={() => onSpeaker(!state.speaker)} label={t("talk.calls.speaker")}>
                {state.speaker ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
              </Ctl>
              <button className="tg-call-btn tg-call-end !h-16 !w-16" onClick={onHangup} aria-label={t("talk.calls.end")}>
                <PhoneOff className="size-6" />
              </button>
            </div>
          )}
          {state.phase !== "ended" && (
            <p className="mt-4 text-center text-[11px] text-white/60">
              <Camera className="me-1 inline size-3" /> {me.displayName} · {t("talk.calls.you")}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Ctl({ on, onClick, label, children, hideOnMobile, disabled }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode; hideOnMobile?: boolean; disabled?: boolean }) {
  return (
    <button className={cn("tg-call-btn disabled:opacity-40", hideOnMobile && "hidden sm:inline-flex")} data-on={on} onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      {children}
    </button>
  );
}
