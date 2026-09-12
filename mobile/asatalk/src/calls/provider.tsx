/** Owns the single active call, polls for incoming ones, and opens the call screen. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Vibration } from "react-native";
import { router } from "expo-router";
import type { MediaStream } from "react-native-webrtc";
import { useQueryClient } from "@tanstack/react-query";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import type { Call, User } from "@/lib/types";
import { toast } from "@/ui/toast";
import { CallSession, type CallPhase, type PeerState } from "./session";
import { GroupCallSession, type GroupPeer, type GroupPhase } from "./group";

export interface ActiveCall { kind: "p2p"; session: CallSession; call: Call; peer: User; phase: CallPhase; reason?: string; local: MediaStream | null; remote: MediaStream | null; peerState: PeerState; muted: boolean; camera: boolean; speaker: boolean }
export interface ActiveGroup { kind: "group"; session: GroupCallSession; call: Call; title: string; phase: GroupPhase; local: MediaStream | null; peers: GroupPeer[]; muted: boolean; camera: boolean; speaker: boolean }
export type Active = ActiveCall | ActiveGroup;
export interface IncomingGroup { call: Call; title: string }

interface Ctx {
  active: Active | null; incomingGroup: IncomingGroup | null;
  startCall: (peer: User, type: "audio" | "video") => Promise<void>;
  startGroupCall: (chatId: string, title: string, type: "audio" | "video") => Promise<void>;
  acceptGroup: () => void; declineGroup: () => void;
  patch: (p: Partial<ActiveCall> | Partial<ActiveGroup>) => void;
  clear: () => void;
}
const C = createContext<Ctx | null>(null);
export const useCalls = () => { const c = useContext(C); if (!c) throw new Error("useCalls outside CallProvider"); return c; };

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const blocked = useStore((s) => s.settings.blocked ?? []);
  const [active, setActive] = useState<Active | null>(null);
  const [incomingGroup, setIncomingGroup] = useState<IncomingGroup | null>(null);
  const ref = useRef<Active | null>(null); ref.current = active;
  const patch = useCallback((p: Partial<Active>) => setActive((a) => (a ? ({ ...a, ...p } as Active) : a)), []);
  const clear = useCallback(() => setActive(null), []);

  const attach = useCallback((call: Call, peer: User, incoming: boolean) => {
    const session = new CallSession(call, me!.id, {
      onPhase: (phase, reason) => { patch({ phase, reason }); if (phase === "ended") { Vibration.cancel(); void qc.invalidateQueries({ queryKey: ["calls"] }); setTimeout(() => setActive((a) => (a?.session === session ? null : a)), 1600); } if (phase === "connected") Vibration.cancel(); },
      onRemoteStream: (remote) => patch({ remote }),
      onLocalStream: (local) => patch({ local, camera: !!local?.getVideoTracks().some((v) => v.enabled) }),
      onPeerState: (peerState) => patch({ peerState }),
      onCall: (c) => patch({ call: c }),
    });
    setActive({ kind: "p2p", session, call, peer, phase: "ringing", local: null, remote: null, peerState: { muted: false, camera: call.type === "video", screen: false }, muted: false, camera: call.type === "video", speaker: call.type === "video" });
    if (incoming) Vibration.vibrate([0, 600, 400], true);
    router.push("/call");
    return session;
  }, [me, patch, qc]);

  const startCall = useCallback(async (peer: User, type: "audio" | "video") => {
    if (ref.current || !me) return;
    try { const { call } = await talkApi.startCall(peer.id, type, me.displayName); const s = attach(call, peer, false); await s.begin(); }
    catch (e) { toast((e as Error).name === "NotAllowedError" ? t("calls.permission") : t("calls.failed")); setActive(null); }
  }, [attach, me]);

  const startGroupCall = useCallback(async (chatId: string, title: string, type: "audio" | "video") => {
    if (ref.current || !me) return;
    try {
      const { call } = await talkApi.startGroupCall(chatId, type, title);
      const session = new GroupCallSession(call, me.id, {
        onPhase: (phase) => { patch({ phase }); if (phase === "ended") { void qc.invalidateQueries({ queryKey: ["calls"] }); setTimeout(() => setActive((a) => (a?.session === session ? null : a)), 1200); } },
        onLocalStream: (local) => patch({ local, camera: !!local?.getVideoTracks().some((v) => v.enabled) }),
        onPeers: (peers) => patch({ peers }),
        onCall: (c) => patch({ call: c }),
      });
      setActive({ kind: "group", session, call, title, phase: "connecting", local: null, peers: [], muted: false, camera: type === "video", speaker: true });
      router.push("/call");
      await session.begin();
    } catch { toast(t("calls.failed")); setActive(null); }
  }, [me, patch, qc]);

  // Idle poll for incoming calls; users come from the query cache.
  useEffect(() => {
    if (!me) return;
    let cancelled = false; const seen = new Set<string>();
    const tick = async () => {
      if (cancelled) return;
      if (!ref.current) {
        try {
          const { call } = await talkApi.incomingCall();
          if (call && !seen.has(call.id) && !ref.current) {
            seen.add(call.id);
            if (call.chatId) {
              const chats = qc.getQueryData<{ chats: { id: string; name: string | null; isMuted?: boolean }[] }>(["chats"])?.chats ?? [];
              const chat = chats.find((c) => c.id === call.chatId);
              if (chat && !chat.isMuted) { setIncomingGroup({ call, title: chat.name ?? t("calls.groupCall") }); Vibration.vibrate([0, 600, 400], true); router.push("/call"); }
            } else {
              const users = qc.getQueryData<{ users: User[] }>(["users"])?.users ?? [];
              const peer = users.find((u) => u.id === call.initiatorId);
              if (peer && !blocked.includes(peer.id)) { const s = attach(call, peer, true); await s.begin(); }
            }
          }
        } catch { /* offline */ }
      }
      if (!cancelled) timer = setTimeout(() => void tick(), 2500);
    };
    let timer = setTimeout(() => void tick(), 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [me, attach, qc, blocked]);

  const acceptGroup = useCallback(() => { const inc = incomingGroup; if (!inc) return; setIncomingGroup(null); Vibration.cancel(); void startGroupCall(inc.call.chatId!, inc.title, inc.call.type); }, [incomingGroup, startGroupCall]);
  const declineGroup = useCallback(() => { const inc = incomingGroup; setIncomingGroup(null); Vibration.cancel(); if (inc) void talkApi.answerCall(inc.call.id, "decline").catch(() => {}); router.back(); }, [incomingGroup]);

  const value = useMemo(() => ({ active, incomingGroup, startCall, startGroupCall, acceptGroup, declineGroup, patch, clear }), [active, incomingGroup, startCall, startGroupCall, acceptGroup, declineGroup, patch, clear]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
