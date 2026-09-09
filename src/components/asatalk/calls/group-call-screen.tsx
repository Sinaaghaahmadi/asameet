"use client";

/**
 * Full-screen group call: a tile per participant, Telegram-style — video
 * where there is video, the avatar where there is not, a speaking/muted
 * badge on each, and the same control bar as a 1:1 call.
 */
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  SwitchCamera,
  Users,
  Video,
  VideoOff,
  ChevronDown,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn, formatDuration, toLocaleDigits } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { User } from "@/lib/types";
import type { GroupPeer, GroupPhase } from "@/lib/talk/group-call";
import { TalkAvatar } from "../glass";

export interface GroupCallState {
  title: string;
  phase: GroupPhase;
  local: MediaStream | null;
  peers: GroupPeer[];
  muted: boolean;
  camera: boolean;
  screen: boolean;
  minimized: boolean;
  video: boolean;
  startedAt: number | null;
}

export function GroupCallScreen({
  state,
  me,
  users,
  onMute,
  onCamera,
  onScreen,
  onSwitchCamera,
  onMinimize,
  onLeave,
}: {
  state: GroupCallState;
  me: User;
  users: Map<string, User>;
  onMute: (m: boolean) => void;
  onCamera: (on: boolean) => void;
  onScreen: (on: boolean) => void;
  onSwitchCamera: () => void;
  onMinimize: (m: boolean) => void;
  onLeave: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const elapsed = useElapsed(state.startedAt);
  const live = state.peers.length + 1;

  if (state.minimized) {
    return (
      <button
        type="button"
        onClick={() => onMinimize(false)}
        className="tg-call-bg z-call fixed end-3 bottom-24 flex items-center gap-2 rounded-2xl px-3 py-2 text-white shadow-xl"
      >
        <Users className="size-4" />
        <span className="text-xs font-bold">{state.title}</span>
        <span className="text-[11px] opacity-80" dir="ltr">
          {toLocaleDigits(elapsed, locale)}
        </span>
      </button>
    );
  }

  // Up to two tiles side by side on a phone, more as the viewport grows.
  const cols = live <= 1 ? 1 : live <= 4 ? 2 : 3;

  return (
    <div className="talk tg-call-bg z-call fixed inset-0 flex flex-col overflow-hidden text-white">
      <header className="relative z-10 flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          className="tg-call-btn !h-10 !w-10"
          onClick={() => onMinimize(true)}
          aria-label={t("talk.calls.minimize")}
        >
          <ChevronDown className="size-5" />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-black">
            {state.title}
          </span>
          <span className="block text-[12px] opacity-75" dir="ltr">
            {state.phase === "connected"
              ? toLocaleDigits(elapsed, locale)
              : t("talk.calls.connecting")}
            {" · "}
            {toLocaleDigits(live, locale)}
          </span>
        </span>
      </header>

      <div
        className="relative z-10 grid flex-1 content-center gap-2 overflow-y-auto p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        <Tile
          stream={state.local}
          user={me}
          muted={state.muted}
          camera={state.camera || state.screen}
          mirror={!state.screen}
          local
          label={t("talk.calls.youLabel")}
        />
        {state.peers.map((p) => (
          <Tile
            key={p.userId}
            stream={p.stream}
            user={users.get(p.userId)}
            muted={p.muted}
            camera={p.camera}
            pending={!p.connected}
            label={users.get(p.userId)?.displayName ?? "?"}
          />
        ))}
      </div>

      <footer className="relative z-10 flex items-center justify-center gap-3 px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <CallBtn
          on={!state.muted}
          onClick={() => onMute(!state.muted)}
          label={t(state.muted ? "talk.calls.unmute" : "talk.calls.mute")}
        >
          {state.muted ? (
            <MicOff className="size-5" />
          ) : (
            <Mic className="size-5" />
          )}
        </CallBtn>
        <CallBtn
          on={state.camera}
          onClick={() => onCamera(!state.camera)}
          label={t(
            state.camera ? "talk.calls.cameraOff" : "talk.calls.cameraOn",
          )}
        >
          {state.camera ? (
            <Video className="size-5" />
          ) : (
            <VideoOff className="size-5" />
          )}
        </CallBtn>
        {state.camera && (
          <CallBtn
            on={false}
            onClick={onSwitchCamera}
            label={t("talk.calls.switchCamera")}
          >
            <SwitchCamera className="size-5" />
          </CallBtn>
        )}
        <CallBtn
          on={state.screen}
          onClick={() => onScreen(!state.screen)}
          label={t(
            state.screen ? "talk.calls.stopShare" : "talk.calls.shareScreen",
          )}
          hideOnMobile
        >
          <MonitorUp className="size-5" />
        </CallBtn>
        <button
          type="button"
          className="tg-call-btn tg-call-end !h-16 !w-16"
          onClick={onLeave}
          aria-label={t("talk.calls.end")}
        >
          <PhoneOff className="size-6" />
        </button>
      </footer>
    </div>
  );
}

function Tile({
  stream,
  user,
  label,
  muted,
  camera,
  mirror,
  local,
  pending,
}: {
  stream: MediaStream | null;
  user?: User;
  label: string;
  muted: boolean;
  camera: boolean;
  mirror?: boolean;
  local?: boolean;
  pending?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = !!stream?.getVideoTracks().some((v) => v.enabled) && camera;

  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-square min-h-0 overflow-hidden rounded-2xl bg-black/35">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local}
        className={cn(
          "h-full w-full object-cover transition-opacity",
          hasVideo ? "opacity-100" : "opacity-0",
          mirror && "scale-x-[-1]",
        )}
      />
      {!hasVideo && (
        <span className="absolute inset-0 grid place-items-center">
          <TalkAvatar
            name={user?.displayName ?? label}
            src={user?.avatar}
            size="lg"
          />
        </span>
      )}
      <span className="absolute inset-x-1 bottom-1 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[11px] font-semibold backdrop-blur-sm">
        {muted ? (
          <MicOff className="size-3 text-red-400" />
        ) : (
          <Mic className="size-3 opacity-80" />
        )}
        <span className="truncate">{label}</span>
        {pending && <Camera className="ms-auto size-3 animate-pulse" />}
      </span>
    </div>
  );
}

function CallBtn({
  on,
  onClick,
  label,
  children,
  hideOnMobile,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  hideOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("tg-call-btn", hideOnMobile && "hidden sm:inline-flex")}
      data-on={on}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/** mm:ss since the first peer connected. */
function useElapsed(startedAt: number | null): string {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt
    ? formatDuration(Math.round((Date.now() - startedAt) / 1000))
    : "0:00";
}
