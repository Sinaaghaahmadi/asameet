"use client";

/**
 * Owns the single active call: starts outgoing calls, polls for incoming
 * ones while idle, and renders the full-screen call UI (or the floating
 * mini window when minimised).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, PhoneOff, Users } from "lucide-react";
import { toast } from "sonner";
import { talkApi } from "@/lib/talk/api";
import {
  playCallEnd,
  playConnected,
  primeAudio,
  startDialTone,
  startRingtone,
} from "@/lib/talk/sounds";
import { CallSession, type CallPhase, type PeerState } from "@/lib/talk/webrtc";
import {
  GroupCallSession,
  type GroupPeer,
  type GroupPhase,
} from "@/lib/talk/group-call";
import { useT } from "@/lib/i18n";
import type { Call, User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { useTalk } from "../talk-data";
import { CallScreen } from "./call-screen";
import { GroupCallScreen } from "./group-call-screen";

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

export interface ActiveGroupCall {
  session: GroupCallSession;
  call: Call;
  title: string;
  phase: GroupPhase;
  local: MediaStream | null;
  peers: GroupPeer[];
  muted: boolean;
  camera: boolean;
  screen: boolean;
  minimized: boolean;
}

interface CallCtx {
  active: ActiveCall | null;
  group: ActiveGroupCall | null;
  startCall: (peer: User, type: "audio" | "video") => Promise<void>;
  /** Start the chat's group call, or join the one already running. */
  startGroupCall: (
    chatId: string,
    title: string,
    type: "audio" | "video",
  ) => Promise<void>;
  busy: boolean;
}

const Ctx = createContext<CallCtx | null>(null);
export function useCalls() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCalls outside CallProvider");
  return c;
}

export function CallProvider({
  me,
  users,
  children,
}: {
  me: User;
  users: Map<string, User>;
  children: React.ReactNode;
}) {
  const t = useT();
  const qc = useQueryClient();
  const settings = useTalkStore((s) => s.settings);
  const { openPrivateChat, chats } = useTalk();
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [group, setGroup] = useState<ActiveGroupCall | null>(null);
  const stopSound = useRef<() => void>(() => undefined);
  const activeRef = useRef<ActiveCall | null>(null);
  const groupRef = useRef<ActiveGroupCall | null>(null);
  const [incomingGroup, setIncomingGroup] = useState<{
    call: Call;
    title: string;
  } | null>(null);
  const chatsRef = useRef(chats);
  activeRef.current = active;
  groupRef.current = group;
  chatsRef.current = chats;

  const patch = useCallback(
    (p: Partial<ActiveCall>) => setActive((a) => (a ? { ...a, ...p } : a)),
    [],
  );

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
            window.setTimeout(
              () => setActive((a) => (a?.session === session ? null : a)),
              1600,
            );
          }
        },
        onRemoteStream: (remote) => patch({ remote }),
        onLocalStream: (local) =>
          patch({
            local,
            camera: !!local?.getVideoTracks().some((v) => v.enabled),
          }),
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
        peerState: {
          muted: false,
          camera: call.type === "video",
          screen: false,
        },
        muted: false,
        camera: call.type === "video",
        screen: false,
        speaker: true,
        minimized: false,
      });
      stopSound.current();
      if (settings.inAppSounds)
        stopSound.current = incoming ? startRingtone() : startDialTone();
      return session;
    },
    [me.id, patch, qc, settings.inAppSounds],
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
        toast.error(
          e instanceof DOMException
            ? t("talk.calls.permission")
            : t("talk.calls.failed"),
        );
        setActive(null);
        stopSound.current();
      }
    },
    [attach, t],
  );

  const patchGroup = useCallback(
    (p: Partial<ActiveGroupCall>) => setGroup((g) => (g ? { ...g, ...p } : g)),
    [],
  );

  /** Join the chat's call — the same button whether it exists yet or not. */
  const startGroupCall = useCallback(
    async (chatId: string, title: string, type: "audio" | "video") => {
      if (activeRef.current || groupRef.current) return;
      if (typeof window !== "undefined" && !window.isSecureContext) {
        toast.error(t("talk.calls.insecure"));
        return;
      }
      primeAudio();
      try {
        const { call } = await talkApi.startGroupCall(chatId, type, title);
        const session = new GroupCallSession(call, me.id, {
          onPhase: (phase, reason) => {
            patchGroup({ phase });
            if (phase === "connected" && settings.inAppSounds) playConnected();
            if (phase === "ended") {
              stopSound.current();
              if (settings.inAppSounds) playCallEnd();
              void qc.invalidateQueries({ queryKey: ["talk", "calls"] });
              void reason;
              window.setTimeout(
                () => setGroup((g) => (g?.session === session ? null : g)),
                1200,
              );
            }
          },
          onLocalStream: (local) =>
            patchGroup({
              local,
              camera: !!local?.getVideoTracks().some((v) => v.enabled),
            }),
          onPeers: (peers) => patchGroup({ peers }),
          onCall: (c) => patchGroup({ call: c }),
        });
        setGroup({
          session,
          call,
          title,
          phase: "connecting",
          local: null,
          peers: [],
          muted: false,
          camera: type === "video",
          screen: false,
          minimized: false,
        });
        await session.begin();
      } catch (e) {
        toast.error(
          e instanceof DOMException
            ? t("talk.calls.permission")
            : t("talk.calls.failed"),
        );
        setGroup(null);
      }
    },
    [me.id, patchGroup, qc, settings.inAppSounds, t],
  );

  // Idle poll: is someone calling me?
  useEffect(() => {
    let cancelled = false;
    const seen = new Set<string>();
    const tick = async () => {
      if (cancelled) return;
      if (!activeRef.current && !groupRef.current) {
        try {
          const { call } = await talkApi.incomingCall();
          if (call && !seen.has(call.id) && !activeRef.current) {
            seen.add(call.id);
            // A group call rings as a chat, not as a person.
            if (call.chatId) {
              const chat = chatsRef.current.find((c) => c.id === call.chatId);
              if (chat && !chat.isMuted) {
                setIncomingGroup({
                  call,
                  title: chat.name ?? t("talk.calls.groupCall"),
                });
                if (settings.inAppSounds) {
                  stopSound.current();
                  stopSound.current = startRingtone();
                }
              }
              if (!cancelled)
                timer = window.setTimeout(() => void tick(), 2500);
              return;
            }
            const peer = call.peerId ? users.get(call.initiatorId) : undefined;
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
  }, [attach, users, settings.blocked, settings.inAppSounds, t]);

  useEffect(() => () => stopSound.current(), []);

  const value = useMemo(
    () => ({
      active,
      group,
      startCall,
      startGroupCall,
      busy: !!active || !!group,
    }),
    [active, group, startCall, startGroupCall],
  );

  const declineGroup = useCallback(() => {
    const inc = incomingGroup;
    setIncomingGroup(null);
    stopSound.current();
    if (inc) void talkApi.answerCall(inc.call.id, "decline").catch(() => {});
  }, [incomingGroup]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {incomingGroup && !group && (
        <IncomingGroupRing
          title={incomingGroup.title}
          type={incomingGroup.call.type}
          onAccept={() => {
            const inc = incomingGroup;
            setIncomingGroup(null);
            stopSound.current();
            void startGroupCall(inc.call.chatId!, inc.title, inc.call.type);
          }}
          onDecline={declineGroup}
        />
      )}
      {group && (
        <GroupCallScreen
          state={{
            title: group.title,
            phase: group.phase,
            local: group.local,
            peers: group.peers,
            muted: group.muted,
            camera: group.camera,
            screen: group.screen,
            minimized: group.minimized,
            video: group.call.type === "video",
            startedAt: group.session.startedAt,
          }}
          me={me}
          users={users}
          onMute={(m) => {
            group.session.setMuted(m);
            patchGroup({ muted: m });
          }}
          onCamera={async (on) => {
            if (on) {
              const ok = await group.session.enableVideo();
              patchGroup({ camera: ok, local: group.session.localStream });
            } else {
              group.session.setCamera(false);
              patchGroup({ camera: false });
            }
          }}
          onScreen={async (on) => {
            const ok = await group.session.shareScreen(on);
            patchGroup({ screen: on && ok });
          }}
          onSwitchCamera={() =>
            void group.session
              .switchCamera()
              .then(() => patchGroup({ local: group.session.localStream }))
          }
          onMinimize={(m) => patchGroup({ minimized: m })}
          onLeave={() => void group.session.leave()}
        />
      )}
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
          onSwitchCamera={() =>
            void active.session
              .switchCamera()
              .then(() => patch({ local: active.session.localStream }))
          }
          onScreen={async (on) => {
            const ok = await active.session.shareScreen(on);
            patch({ screen: on && ok });
          }}
          onSpeaker={(s) => patch({ speaker: s })}
          onMinimize={(m) => patch({ minimized: m })}
          onMessage={() => {
            const peer = active.peer;
            if (active.phase !== "ended") void active.session.decline();
            setActive(null);
            stopSound.current();
            void openPrivateChat(peer.id).catch(() => undefined);
          }}
          onCallAgain={() => {
            const { peer, call } = active;
            setActive(null);
            window.setTimeout(() => void startCall(peer, call.type), 50);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

/** The group-call ring: a chat is calling, not a person. */
function IncomingGroupRing({
  title,
  type,
  onAccept,
  onDecline,
}: {
  title: string;
  type: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useT();
  return (
    <div className="talk tg-call-bg z-call fixed inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center text-white">
      <span className="relative grid size-28 place-items-center rounded-full bg-white/10">
        <Users className="size-12" />
        <span className="tg-call-ring" />
        <span className="tg-call-ring" />
        <span className="tg-call-ring" />
      </span>
      <span>
        <span className="block text-[22px] font-black">{title}</span>
        <span className="block text-sm opacity-80">
          {t(
            type === "video" ? "talk.calls.videoCall" : "talk.calls.audioCall",
          )}
          {" · "}
          {t("talk.calls.groupCall")}
        </span>
      </span>
      <div className="mt-4 flex items-center gap-10">
        <button
          type="button"
          className="tg-call-btn tg-call-end !h-[68px] !w-[68px]"
          onClick={onDecline}
          aria-label={t("talk.calls.decline")}
        >
          <PhoneOff className="size-7" />
        </button>
        <button
          type="button"
          className="tg-call-btn tg-call-accept tg-ring-shake !h-[68px] !w-[68px]"
          onClick={onAccept}
          aria-label={t("talk.calls.accept")}
        >
          <Phone className="size-7" />
        </button>
      </div>
    </div>
  );
}
