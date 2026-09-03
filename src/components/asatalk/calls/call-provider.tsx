"use client";

/**
 * Owns the single active call: starts outgoing calls, polls for incoming
 * ones while idle, and renders the full-screen call UI (or the floating
 * mini window when minimised).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { talkApi } from "@/lib/talk/api";
import { playCallEnd, playConnected, primeAudio, startDialTone, startRingtone } from "@/lib/talk/sounds";
import { CallSession, type CallPhase, type PeerState } from "@/lib/talk/webrtc";
import { useT } from "@/lib/i18n";
import type { Call, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { CallScreen } from "./call-screen";

export interface ActiveCall {
  session: CallSession;
  call: Call;
  peer: User;
  phase: CallPhase;
  reason?: string;
  local: MediaStream | null;
  remote: MediaStream | null;
  peerState: PeerState;
  muted: boolean;
  camera: boolean;
  screen: boolean;
  speaker: boolean;
  minimized: boolean;
}

interface CallCtx {
  active: ActiveCall | null;
  startCall: (peer: User, type: "audio" | "video") => Promise<void>;
}

const Ctx = createContext<CallCtx | null>(null);
export function useCalls() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCalls outside CallProvider");
  return c;
}

export function CallProvider({ me, users, children }: { me: User; users: Map<string, User>; children: React.ReactNode }) {
  const t = useT();
  const qc = useQueryClient();
  const settings = useTalkStore((s) => s.settings);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const stopSound = useRef<() => void>(() => undefined);
  const activeRef = useRef<ActiveCall | null>(null);
  activeRef.current = active;

  const patch = useCallback((p: Partial<ActiveCall>) => setActive((a) => (a ? { ...a, ...p } : a)), []);

  const attach = useCallback(
    (call: Call, peer: User, incoming: boolean) => {
      const session = new CallSession(call, me.id, {
        onPhase: (phase, reason) => {
          patch({ phase, reason });
          if (phase === "connected") {
            stopSound.current();
            if (settings.inAppSounds) playConnected();
          }
          if (phase === "ended") {
            stopSound.current();
            if (settings.inAppSounds) playCallEnd();
            void qc.invalidateQueries({ queryKey: ["talk", "calls"] });
            window.setTimeout(() => setActive((a) => (a?.session === session ? null : a)), 1600);
          }
        },
        onRemoteStream: (remote) => patch({ remote }),
        onLocalStream: (local) => patch({ local, camera: !!local?.getVideoTracks().some((v) => v.enabled) }),
        onPeerState: (peerState) => patch({ peerState }),
        onCall: (c) => patch({ call: c }),
      });
      setActive({
        session,
        call,
        peer,
        phase: "ringing",
        local: null,
        remote: null,
        peerState: { muted: false, camera: call.type === "video", screen: false },
        muted: false,
        camera: call.type === "video",
        screen: false,
        speaker: true,
        minimized: false,
      });
      stopSound.current();
      if (settings.inAppSounds) stopSound.current = incoming ? startRingtone() : startDialTone();
      return session;
    },
    [me.id, patch, qc, settings.inAppSounds]
  );

  const startCall = useCallback(
    async (peer: User, type: "audio" | "video") => {
      if (activeRef.current) return;
      if (typeof window !== "undefined" && !window.isSecureContext) {
        toast.error(t("talk.calls.insecure"));
        return;
      }
      primeAudio();
      try {
        const { call } = await talkApi.startCall(peer.id, type);
        const session = attach(call, peer, false);
        await session.begin();
      } catch (e) {
        toast.error(e instanceof DOMException ? t("talk.calls.permission") : t("talk.calls.failed"));
        setActive(null);
        stopSound.current();
      }
    },
    [attach, t]
  );

  // Idle poll: is someone calling me?
  useEffect(() => {
    let cancelled = false;
    const seen = new Set<string>();
    const tick = async () => {
      if (cancelled) return;
      if (!activeRef.current) {
        try {
          const { call } = await talkApi.incomingCall();
          if (call && !seen.has(call.id) && !activeRef.current) {
            seen.add(call.id);
            const peer = users.get(call.initiatorId);
            if (peer && !(settings.blocked ?? []).includes(peer.id)) {
              const session = attach(call, peer, true);
              await session.begin();
            }
          }
        } catch {
          /* offline */
        }
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(), 2500);
    };
    let timer = window.setTimeout(() => void tick(), 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attach, users, settings.blocked]);

  useEffect(() => () => stopSound.current(), []);

  const value = useMemo(() => ({ active, startCall }), [active, startCall]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {active && (
        <CallScreen
          state={active}
          me={me}
          onAccept={() => {
            primeAudio();
            stopSound.current();
            void active.session.accept().catch(() => {
              toast.error(t("talk.calls.permission"));
              void active.session.decline();
            });
          }}
          onDecline={() => void active.session.decline()}
          onHangup={() => void active.session.hangup()}
          onMute={(m) => {
            active.session.setMuted(m);
            patch({ muted: m });
          }}
          onCamera={async (on) => {
            if (on) {
              const ok = await active.session.enableVideo();
              patch({ camera: ok, local: active.session.localStream });
            } else {
              active.session.setCamera(false);
              patch({ camera: false });
            }
          }}
          onSwitchCamera={() => void active.session.switchCamera().then(() => patch({ local: active.session.localStream }))}
          onScreen={async (on) => {
            const ok = await active.session.shareScreen(on);
            patch({ screen: on && ok });
          }}
          onSpeaker={(s) => patch({ speaker: s })}
          onMinimize={(m) => patch({ minimized: m })}
        />
      )}
    </Ctx.Provider>
  );
}
