/** Full-screen call: 1:1 (ringing / connected / ended) and the group tile grid. */
import React, { useEffect, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RTCView, type MediaStream } from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";
import { useCalls, type ActiveCall, type ActiveGroup } from "@/calls/provider";
import { useUsers } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { digits, formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { Avatar, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

function useElapsed(startedAt: number | null) {
  const [, tick] = useState(0);
  useEffect(() => { if (!startedAt) return; const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i); }, [startedAt]);
  return startedAt ? formatDuration(Math.round((Date.now() - startedAt) / 1000)) : "0:00";
}

export default function CallScreen() {
  const th = useTheme();
  const router = useRouter();
  const { active, incomingGroup, acceptGroup, declineGroup, patch } = useCalls();

  // Route audio: speaker for video / group, earpiece for a voice call.
  useEffect(() => {
    if (!active) return;
    InCallManager.start({ media: active.kind === "group" || active.call.type === "video" ? "video" : "audio" });
    InCallManager.setForceSpeakerphoneOn(active.speaker);
    return () => { InCallManager.stop(); };
  }, [active?.kind, active?.call.type]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) InCallManager.setForceSpeakerphoneOn(active.speaker); }, [active?.speaker]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!active && !incomingGroup) router.back(); }, [active, incomingGroup, router]);

  if (incomingGroup && !active) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: th.glass, alignItems: "center", justifyContent: "center" }}><Ionicons name="people" size={56} color="#fff" /></View>
      <Txt bold size={24} style={{ color: "#fff" }}>{incomingGroup.title}</Txt>
      <Txt style={{ color: "#cbd5e1" }}>{incomingGroup.call.type === "video" ? t("calls.videoCall") : t("calls.audioCall")} · {t("calls.groupCall")}</Txt>
      <View style={{ flexDirection: "row", gap: 48, marginTop: 24 }}>
        <Round icon="call" bg={th.danger} label={t("calls.decline")} onPress={declineGroup} rotate />
        <Round icon="call" bg={th.success} label={t("calls.accept")} onPress={acceptGroup} />
      </View>
    </SafeAreaView>
  );
  if (!active) return <View style={{ flex: 1, backgroundColor: "#0b1220" }} />;
  return active.kind === "group" ? <GroupView a={active} patch={patch} /> : <P2PView a={active} patch={patch} />;
}

function Round({ icon, bg, label, onPress, rotate, big }: { icon: keyof typeof Ionicons.glyphMap; bg: string; label?: string; onPress: () => void; rotate?: boolean; big?: boolean }) {
  const s = big ? 72 : 60;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ width: s, height: s, borderRadius: s / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
        <Ionicons name={icon} size={big ? 32 : 26} color="#fff" style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined} />
      </Pressable>
      {label ? <Txt size={12} style={{ color: "#cbd5e1" }}>{label}</Txt> : null}
    </View>
  );
}
function Ctl({ icon, on, onPress }: { icon: keyof typeof Ionicons.glyphMap; on?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, backgroundColor: on ? "#fff" : "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}><Ionicons name={icon} size={24} color={on ? "#0b1220" : "#fff"} /></Pressable>;
}

function P2PView({ a, patch }: { a: ActiveCall; patch: (p: Partial<ActiveCall>) => void }) {
  const th = useTheme();
  const elapsed = useElapsed(a.session.startedAt);
  const incoming = !a.session.isCaller && a.phase === "ringing";
  const hasRemoteVideo = !!a.remote?.getVideoTracks().some((v) => v.enabled) && a.peerState.camera;
  const status = a.phase === "ringing" ? (incoming ? (a.call.type === "video" ? t("calls.incomingVideo") : t("calls.incomingAudio")) : t("calls.ringing"))
    : a.phase === "connecting" ? t("calls.connecting") : a.phase === "connected" ? digits(elapsed)
    : a.reason === "declined" ? t("calls.declinedMsg") : a.reason === "missed" ? t("calls.noAnswer") : a.reason === "failed" || a.reason === "stalled" ? t("calls.failed") : t("calls.ended");
  return (
    <View style={{ flex: 1, backgroundColor: "#0b1220" }}>
      {hasRemoteVideo && a.remote && <RTCView streamURL={a.remote.toURL()} objectFit="cover" style={{ position: "absolute", inset: 0 }} />}
      {a.local && a.camera && <RTCView streamURL={a.local.toURL()} objectFit="cover" mirror style={{ position: "absolute", top: 60, right: 16, width: 110, height: 160, borderRadius: 16, overflow: "hidden", zIndex: 5 }} />}
      <SafeAreaView style={{ flex: 1, justifyContent: "space-between", padding: 24 }}>
        <View style={{ alignItems: "center", marginTop: 40, gap: 14 }}>
          {!hasRemoteVideo && <Avatar name={a.peer.displayName} src={a.peer.avatar} size={120} />}
          <Txt bold size={26} style={{ color: "#fff" }}>{a.peer.displayName}</Txt>
          <Txt style={{ color: "#cbd5e1", fontSize: 16 }}>{status}</Txt>
          {a.phase === "connected" && a.peerState.muted && <Txt size={12} style={{ color: "#fbbf24" }}>🔇 {t("calls.mute")}</Txt>}
          <Txt size={11} style={{ color: "#64748b" }}>🔒 {t("calls.encrypted")}</Txt>
        </View>
        <View style={{ alignItems: "center", gap: 22 }}>
          {a.phase !== "ended" && !incoming && (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Ctl icon={a.muted ? "mic-off" : "mic"} on={a.muted} onPress={() => { a.session.setMuted(!a.muted); patch({ muted: !a.muted }); }} />
              <Ctl icon={a.camera ? "videocam" : "videocam-off"} on={a.camera} onPress={async () => { if (a.camera) { a.session.setCamera(false); patch({ camera: false }); } else { const ok = await a.session.enableVideo(); patch({ camera: ok, local: a.session.localStream }); } }} />
              {a.camera && <Ctl icon="camera-reverse" onPress={() => a.session.switchCamera()} />}
              <Ctl icon={a.speaker ? "volume-high" : "volume-medium"} on={a.speaker} onPress={() => patch({ speaker: !a.speaker })} />
            </View>
          )}
          {incoming ? (
            <View style={{ flexDirection: "row", gap: 64 }}>
              <Round icon="call" bg={th.danger} label={t("calls.decline")} onPress={() => void a.session.decline()} rotate big />
              <Round icon="call" bg={th.success} label={t("calls.accept")} onPress={() => void a.session.accept().catch(() => a.session.decline())} big />
            </View>
          ) : a.phase === "ended" ? null : (
            <Round icon="call" bg={th.danger} onPress={() => void a.session.hangup()} rotate big />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function GroupView({ a, patch }: { a: ActiveGroup; patch: (p: Partial<ActiveGroup>) => void }) {
  const th = useTheme();
  const { user: me } = useAuth();
  const { users } = useUsers();
  const { width } = useWindowDimensions();
  const elapsed = useElapsed(a.session.startedAt);
  const live = a.peers.length + 1;
  const cols = live <= 1 ? 1 : live <= 4 ? 2 : 3;
  const tile = (width - 16 - (cols - 1) * 8) / cols;
  const Tile = ({ stream, name, avatar, muted, camera, mirror, pending }: { stream: MediaStream | null; name: string; avatar?: string | null; muted: boolean; camera: boolean; mirror?: boolean; pending?: boolean }) => (
    <View style={{ width: tile, height: tile, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
      {stream && camera ? <RTCView streamURL={stream.toURL()} objectFit="cover" mirror={mirror} style={{ position: "absolute", inset: 0 }} /> : <Avatar name={name} src={avatar} size={tile * 0.42} />}
      <View style={{ position: "absolute", left: 6, right: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Ionicons name={muted ? "mic-off" : "mic"} size={12} color={muted ? "#f87171" : "#fff"} /><Txt size={11} numberOfLines={1} style={{ color: "#fff", flex: 1 }}>{name}</Txt>{pending && <Ionicons name="ellipsis-horizontal" size={12} color="#fff" />}
      </View>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Txt bold size={18} style={{ color: "#fff" }}>{a.title}</Txt>
        <Txt size={12} style={{ color: "#cbd5e1" }}>{a.phase === "connected" ? digits(elapsed) : t("calls.connecting")} · {digits(live)}</Txt>
      </View>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8, alignContent: "center", justifyContent: "center" }}>
        <Tile stream={a.local} name={t("calls.youLabel")} avatar={me?.avatar} muted={a.muted} camera={a.camera} mirror />
        {a.peers.map((p) => <Tile key={p.userId} stream={p.stream} name={users.get(p.userId)?.displayName ?? "?"} avatar={users.get(p.userId)?.avatar} muted={p.muted} camera={p.camera} pending={!p.connected} />)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 18, padding: 24 }}>
        <Ctl icon={a.muted ? "mic-off" : "mic"} on={a.muted} onPress={() => { a.session.setMuted(!a.muted); patch({ muted: !a.muted }); }} />
        <Ctl icon={a.camera ? "videocam" : "videocam-off"} on={a.camera} onPress={() => { a.session.setCamera(!a.camera); patch({ camera: !a.camera }); }} />
        {a.camera && <Ctl icon="camera-reverse" onPress={() => a.session.switchCamera()} />}
        <Round icon="call" bg={th.danger} onPress={() => void a.session.leave()} rotate big />
      </View>
    </SafeAreaView>
  );
}
