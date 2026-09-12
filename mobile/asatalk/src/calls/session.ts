/**
 * One-to-one WebRTC session on react-native-webrtc. Signalling is the same
 * database mailbox the web app polls, so a phone and a browser can call each
 * other. Mirrors src/lib/talk/webrtc.ts on the web, minus screen share.
 */
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream, MediaStreamTrack, mediaDevices } from "react-native-webrtc";
import { talkApi, type SignalPayload } from "@/lib/api";
import type { Call } from "@/lib/types";

export type CallPhase = "ringing" | "connecting" | "connected" | "ended";
export interface PeerState { muted: boolean; camera: boolean; screen: boolean }
export interface SessionEvents {
  onPhase: (phase: CallPhase, reason?: string) => void;
  onRemoteStream: (s: MediaStream | null) => void;
  onLocalStream: (s: MediaStream | null) => void;
  onPeerState: (s: PeerState) => void;
  onCall: (c: Call) => void;
}
export function iceServers() {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = process.env.EXPO_PUBLIC_TURN_URL;
  if (turn) servers.push({ urls: turn.split(",").map((u) => u.trim()), username: process.env.EXPO_PUBLIC_TURN_USER, credential: process.env.EXPO_PUBLIC_TURN_PASS });
  return servers;
}
export async function getCallMedia(video: boolean): Promise<MediaStream> {
  try {
    return await mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user", width: 1280, height: 720, frameRate: 30 } : false }) as MediaStream;
  } catch (e) {
    if (video) return await mediaDevices.getUserMedia({ audio: true, video: false }) as MediaStream;
    throw e;
  }
}
// react-native-webrtc types its event target loosely; these are the standard events.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PC = RTCPeerConnection & { addEventListener(type: string, fn: (e: any) => void): void };

export class CallSession {
  readonly isCaller: boolean;
  private pc: PC | null = null;
  private local: MediaStream | null = null;
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  private pendingIce: RTCIceCandidateInit[] = [];
  private offerSent = false;
  private restarts = 0;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  phase: CallPhase = "ringing";
  video: boolean;
  startedAt: number | null = null;

  constructor(public call: Call, private readonly myId: string, private readonly ev: SessionEvents) {
    this.isCaller = call.initiatorId === myId;
    this.video = call.type === "video";
  }
  async begin() { this.setPhase("ringing"); if (this.isCaller) await this.captureMedia(); this.poll(); }
  async accept() { await this.captureMedia(); await talkApi.answerCall(this.call.id, "accept"); this.setPhase("connecting"); this.poll(); }
  async decline() { await talkApi.answerCall(this.call.id, "decline").catch(() => {}); this.finish("declined"); }
  async hangup() {
    const duration = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
    await talkApi.signal(this.call.id, { kind: "bye" } satisfies SignalPayload).catch(() => {});
    await talkApi.endCall(this.call.id, duration).catch(() => {});
    this.finish("hangup");
  }
  get localStream() { return this.local; }
  get duration() { return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0; }
  setMuted(muted: boolean) { this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted)); void this.sendState(); }
  setCamera(on: boolean) { this.local?.getVideoTracks().forEach((t) => (t.enabled = on)); void this.sendState(); }
  async enableVideo(): Promise<boolean> {
    if (!this.local) return false;
    if (this.local.getVideoTracks().length) { this.setCamera(true); return true; }
    try {
      const cam = await mediaDevices.getUserMedia({ video: { facingMode: "user" } }) as MediaStream;
      const track = cam.getVideoTracks()[0];
      this.local.addTrack(track);
      const sender = this.pc?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track); else this.pc?.addTrack(track, this.local);
      this.video = true; this.ev.onLocalStream(this.local);
      await this.renegotiate(); void this.sendState(); return true;
    } catch { return false; }
  }
  switchCamera() { const v = this.local?.getVideoTracks()[0] as (MediaStreamTrack & { _switchCamera?: () => void }) | undefined; v?._switchCamera?.(); }

  private async sendState() {
    if (!this.alive) return;
    const a = this.local?.getAudioTracks()[0], v = this.local?.getVideoTracks()[0];
    await talkApi.signal(this.call.id, { kind: "state", muted: a ? !a.enabled : true, camera: !!v && v.enabled, screen: false } satisfies SignalPayload).catch(() => {});
  }
  private async captureMedia() { if (this.local) return; this.local = await getCallMedia(this.video); this.video = this.local.getVideoTracks().length > 0; this.ev.onLocalStream(this.local); }
  private ensurePeer(): PC {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: iceServers(), bundlePolicy: "max-bundle" }) as unknown as PC;
    this.pc = pc;
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    if (!this.local?.getVideoTracks().length) pc.addTransceiver("video", { direction: "sendrecv" });
    const remote = new MediaStream(undefined);
    pc.addEventListener("icecandidate", (e: { candidate: RTCIceCandidate | null }) => {
      if (e.candidate) void talkApi.signal(this.call.id, { kind: "ice", candidate: e.candidate.toJSON() } satisfies SignalPayload).catch(() => {});
    });
    pc.addEventListener("track", (e: { track: MediaStreamTrack; streams: MediaStream[] }) => {
      (e.streams[0] ?? { getTracks: () => [e.track] }).getTracks().forEach((t: MediaStreamTrack) => { if (!remote.getTracks().some((x) => x.id === t.id)) remote.addTrack(t); });
      this.ev.onRemoteStream(remote);
    });
    const settle = () => {
      const st = pc.connectionState, ice = pc.iceConnectionState;
      if (st === "connected" || ice === "connected" || ice === "completed") this.markConnected();
      else if (st === "failed" || ice === "failed") this.recover("failed");
    };
    pc.addEventListener("connectionstatechange", settle);
    pc.addEventListener("iceconnectionstatechange", settle);
    return pc;
  }
  private markConnected() { if (!this.alive) return; this.clearWatchdog(); this.startedAt ??= Date.now(); if (this.phase !== "connected") { this.setPhase("connected"); void this.sendState(); } }
  private recover(reason: string) {
    if (!this.alive) return;
    if (this.restarts >= 2) return this.finish(reason);
    this.restarts++; this.armWatchdog();
    if (this.isCaller) void this.makeOffer(true).catch(() => {});
    else void talkApi.signal(this.call.id, { kind: "restart" } satisfies SignalPayload).catch(() => {});
  }
  private armWatchdog() { this.clearWatchdog(); this.watchdog = setTimeout(() => { this.watchdog = null; if (!this.alive || this.phase === "connected") return; if (this.restarts < 2) this.recover("stalled"); else this.finish("failed"); }, 15_000); }
  private clearWatchdog() { if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null; }
  private async makeOffer(iceRestart = false) {
    const pc = this.ensurePeer();
    const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : {});
    await pc.setLocalDescription(offer);
    await talkApi.signal(this.call.id, { kind: "offer", sdp: offer.sdp ?? "" } satisfies SignalPayload);
    this.offerSent = true; this.armWatchdog();
  }
  private async renegotiate() { if (this.pc && this.phase === "connected") await this.makeOffer(); }
  private async handleSignal(p: SignalPayload) {
    switch (p.kind) {
      case "offer": { const pc = this.ensurePeer(); await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: p.sdp })); await this.flushIce(); const a = await pc.createAnswer(); await pc.setLocalDescription(a); await talkApi.signal(this.call.id, { kind: "answer", sdp: a.sdp ?? "" } satisfies SignalPayload); this.armWatchdog(); break; }
      case "answer": { const pc = this.ensurePeer(); if (pc.signalingState === "have-local-offer") { await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: p.sdp })); await this.flushIce(); } break; }
      case "ice": { const pc = this.ensurePeer(); if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => {}); else this.pendingIce.push(p.candidate); break; }
      case "state": this.ev.onPeerState({ muted: !!p.muted, camera: !!p.camera, screen: !!p.screen }); break;
      case "restart": if (this.isCaller && this.phase !== "ended") await this.makeOffer(true).catch(() => {}); break;
      case "bye": this.finish("remote"); break;
    }
  }
  private async flushIce() { const pc = this.pc; if (!pc) return; for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}); }
  private poll() {
    if (this.pollTimer || !this.alive) return;
    const tick = async () => {
      if (!this.alive) return;
      try {
        const data = await talkApi.pollCall(this.call.id, this.cursor);
        this.call = data.call; this.ev.onCall(data.call);
        if (data.call.status === "declined") return this.finish("declined");
        if (data.call.status === "ended") return this.finish(this.startedAt ? "remote" : "missed");
        if (data.call.status === "active" && this.isCaller && !this.offerSent) { this.setPhase("connecting"); await this.makeOffer(); }
        for (const s of data.signals) { this.cursor = Math.max(this.cursor, s.id); await this.handleSignal(s.payload); }
      } catch { /* retried next tick */ }
      if (this.alive) this.pollTimer = setTimeout(() => void tick(), this.phase === "connected" ? 1500 : 800);
    };
    this.pollTimer = setTimeout(() => void tick(), 0);
  }
  private setPhase(phase: CallPhase, reason?: string) { if (this.phase === phase && phase !== "ended") return; this.phase = phase; this.ev.onPhase(phase, reason); }
  private finish(reason: string) {
    if (!this.alive) return; this.alive = false;
    if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null; this.clearWatchdog();
    this.local?.getTracks().forEach((t) => t.stop()); this.local = null;
    try { this.pc?.close(); } catch { /* ignore */ } this.pc = null;
    this.ev.onLocalStream(null); this.ev.onRemoteStream(null); this.setPhase("ended", reason);
  }
}
