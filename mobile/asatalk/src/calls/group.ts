/** Group call as a full mesh — one peer connection per other participant. Port of src/lib/talk/group-call.ts. */
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream, MediaStreamTrack } from "react-native-webrtc";
import { talkApi, type SignalPayload } from "@/lib/api";
import type { Call } from "@/lib/types";
import { getCallMedia, iceServers, type PC } from "./session";

export type GroupPhase = "connecting" | "connected" | "ended";
export interface GroupPeer { userId: string; stream: MediaStream | null; connected: boolean; muted: boolean; camera: boolean }
export interface GroupEvents { onPhase: (p: GroupPhase, reason?: string) => void; onLocalStream: (s: MediaStream | null) => void; onPeers: (p: GroupPeer[]) => void; onCall: (c: Call) => void }
interface Link { pc: PC; stream: MediaStream; pendingIce: RTCIceCandidateInit[]; offerer: boolean; connected: boolean }

export class GroupCallSession {
  phase: GroupPhase = "connecting"; video: boolean; startedAt: number | null = null;
  private local: MediaStream | null = null;
  private links = new Map<string, Link>();
  private roster = new Map<string, { muted: boolean; camera: boolean }>();
  private cursor = 0; private pollTimer: ReturnType<typeof setTimeout> | null = null; private alive = true; private muted = false;
  constructor(public call: Call, private readonly myId: string, private readonly ev: GroupEvents) { this.video = call.type === "video"; }
  async begin() { this.local = await getCallMedia(this.video); this.video = this.local.getVideoTracks().length > 0; this.ev.onLocalStream(this.local); this.setPhase("connecting"); this.poll(); void this.publish(); }
  get localStream() { return this.local; }
  get duration() { return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0; }
  setMuted(m: boolean) { this.muted = m; this.local?.getAudioTracks().forEach((t) => (t.enabled = !m)); void this.publish(); }
  setCamera(on: boolean) { this.local?.getVideoTracks().forEach((t) => (t.enabled = on)); void this.publish(); }
  switchCamera() { const v = this.local?.getVideoTracks()[0] as (MediaStreamTrack & { _switchCamera?: () => void }) | undefined; v?._switchCamera?.(); }
  async leave() {
    for (const peerId of this.links.keys()) await talkApi.signal(this.call.id, { kind: "bye" } satisfies SignalPayload, peerId).catch(() => {});
    await talkApi.leaveCall(this.call.id).catch(() => {}); this.finish("hangup");
  }
  private publish() { const v = this.local?.getVideoTracks()[0]; return talkApi.callPresence(this.call.id, { muted: this.muted, camera: !!v && v.enabled }).catch(() => {}); }
  private link(peerId: string): Link {
    const ex = this.links.get(peerId); if (ex) return ex;
    const pc = new RTCPeerConnection({ iceServers: iceServers(), bundlePolicy: "max-bundle" }) as unknown as PC;
    const stream = new MediaStream(undefined);
    const link: Link = { pc, stream, pendingIce: [], offerer: this.myId < peerId, connected: false };
    this.links.set(peerId, link);
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    if (!this.local?.getVideoTracks().length) pc.addTransceiver("video", { direction: "sendrecv" });
    pc.addEventListener("icecandidate", (e: { candidate: RTCIceCandidate | null }) => { if (e.candidate) void talkApi.signal(this.call.id, { kind: "ice", candidate: e.candidate.toJSON() } satisfies SignalPayload, peerId).catch(() => {}); });
    pc.addEventListener("track", (e: { track: MediaStreamTrack; streams: MediaStream[] }) => { (e.streams[0] ?? { getTracks: () => [e.track] }).getTracks().forEach((t: MediaStreamTrack) => { if (!stream.getTracks().some((x) => x.id === t.id)) stream.addTrack(t); }); this.emitPeers(); });
    const settle = () => { const st = pc.connectionState, ice = pc.iceConnectionState; link.connected = st === "connected" || ice === "connected" || ice === "completed"; if (link.connected) { this.startedAt ??= Date.now(); this.setPhase("connected"); } if (st === "failed" || ice === "failed") this.drop(peerId); this.emitPeers(); };
    pc.addEventListener("connectionstatechange", settle); pc.addEventListener("iceconnectionstatechange", settle);
    return link;
  }
  private async offer(peerId: string) { const l = this.link(peerId); const o = await l.pc.createOffer({}); await l.pc.setLocalDescription(o); await talkApi.signal(this.call.id, { kind: "offer", sdp: o.sdp ?? "" } satisfies SignalPayload, peerId); }
  private drop(peerId: string) { const l = this.links.get(peerId); if (!l) return; try { l.pc.close(); } catch { /* */ } this.links.delete(peerId); this.emitPeers(); }
  private async handle(from: string, p: SignalPayload) {
    switch (p.kind) {
      case "offer": { const l = this.link(from); await l.pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: p.sdp })); await this.flush(l); const a = await l.pc.createAnswer(); await l.pc.setLocalDescription(a); await talkApi.signal(this.call.id, { kind: "answer", sdp: a.sdp ?? "" } satisfies SignalPayload, from); break; }
      case "answer": { const l = this.links.get(from); if (l?.pc.signalingState === "have-local-offer") { await l.pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: p.sdp })); await this.flush(l); } break; }
      case "ice": { const l = this.link(from); if (l.pc.remoteDescription) await l.pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => {}); else l.pendingIce.push(p.candidate); break; }
      case "bye": this.drop(from); break;
      default: break;
    }
  }
  private async flush(l: Link) { for (const c of l.pendingIce.splice(0)) await l.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}); }
  private poll() {
    if (this.pollTimer || !this.alive) return;
    const tick = async () => {
      if (!this.alive) return;
      try {
        const data = await talkApi.pollCall(this.call.id, this.cursor);
        this.call = data.call; this.ev.onCall(data.call);
        if (data.call.status === "ended") return this.finish("remote");
        const joined = new Set<string>(); this.roster.clear();
        for (const p of data.call.participants) {
          if (p.userId === this.myId) continue;
          this.roster.set(p.userId, { muted: p.muted, camera: p.camera });
          if (p.state !== "joined") continue; joined.add(p.userId);
          if (!this.links.has(p.userId)) { const l = this.link(p.userId); if (l.offerer) await this.offer(p.userId).catch(() => {}); }
        }
        for (const id of [...this.links.keys()]) if (!joined.has(id)) this.drop(id);
        for (const s of data.signals) { this.cursor = Math.max(this.cursor, s.id); await this.handle(s.from, s.payload); }
        this.emitPeers();
      } catch { /* retried */ }
      if (this.alive) this.pollTimer = setTimeout(() => void tick(), this.phase === "connected" ? 1800 : 900);
    };
    this.pollTimer = setTimeout(() => void tick(), 0);
  }
  private emitPeers() { const out: GroupPeer[] = []; for (const [userId, l] of this.links) { const m = this.roster.get(userId); out.push({ userId, stream: l.stream.getTracks().length ? l.stream : null, connected: l.connected, muted: m?.muted ?? false, camera: m?.camera ?? false }); } this.ev.onPeers(out); }
  private setPhase(p: GroupPhase, reason?: string) { if (this.phase === p && p !== "ended") return; this.phase = p; this.ev.onPhase(p, reason); }
  private finish(reason: string) {
    if (!this.alive) return; this.alive = false;
    if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null;
    for (const l of this.links.values()) { try { l.pc.close(); } catch { /* */ } } this.links.clear();
    this.local?.getTracks().forEach((t) => t.stop()); this.local = null;
    this.ev.onLocalStream(null); this.ev.onPeers([]); this.setPhase("ended", reason);
  }
}
