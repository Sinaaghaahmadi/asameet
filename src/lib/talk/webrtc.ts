"use client";

/**
 * One-to-one WebRTC session. Signalling travels through the database mailbox
 * (`/api/calls/:id`, polled every second while the call is alive), so no
 * extra realtime service is needed. STUN is public Google; a TURN relay can
 * be supplied through NEXT_PUBLIC_TURN_URL / _USER / _PASS for strict NATs.
 */
import { talkApi, type SignalPayload } from "./api";
import type { Call } from "@/lib/types";

export type CallPhase = "ringing" | "connecting" | "connected" | "ended";

export interface PeerState {
  muted: boolean;
  camera: boolean;
  screen: boolean;
}

export interface SessionEvents {
  onPhase: (phase: CallPhase, reason?: string) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onPeerState: (state: PeerState) => void;
  onCall: (call: Call) => void;
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(",").map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_TURN_PASS,
    });
  }
  return servers;
}

export class CallSession {
  readonly call: Call;
  readonly isCaller: boolean;
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private cursor = 0;
  private pollTimer: number | null = null;
  private alive = true;
  private pendingIce: RTCIceCandidateInit[] = [];
  private offerSent = false;
  phase: CallPhase = "ringing";
  video: boolean;
  startedAt: number | null = null;

  constructor(
    call: Call,
    private readonly myId: string,
    private readonly ev: SessionEvents
  ) {
    this.call = call;
    this.isCaller = call.initiatorId === myId;
    this.video = call.type === "video";
  }

  /** Caller: start ringing + polling. Callee: begin polling after accept(). */
  async begin(): Promise<void> {
    this.setPhase("ringing");
    if (this.isCaller) await this.captureMedia();
    this.poll();
  }

  async accept(): Promise<void> {
    await this.captureMedia();
    await talkApi.answerCall(this.call.id, "accept");
    this.setPhase("connecting");
    this.poll();
  }

  async decline(): Promise<void> {
    await talkApi.answerCall(this.call.id, "decline").catch(() => undefined);
    this.finish("declined");
  }

  async hangup(): Promise<void> {
    const duration = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
    await talkApi.signal(this.call.id, { kind: "bye" } satisfies SignalPayload).catch(() => undefined);
    await talkApi.endCall(this.call.id, duration).catch(() => undefined);
    this.finish("hangup");
  }

  get localStream() {
    return this.local;
  }

  setMuted(muted: boolean) {
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    void this.sendState();
  }

  setCamera(on: boolean) {
    this.local?.getVideoTracks().forEach((t) => (t.enabled = on));
    void this.sendState();
  }

  async enableVideo(): Promise<boolean> {
    if (!this.local) return false;
    if (this.local.getVideoTracks().length > 0) {
      this.setCamera(true);
      return true;
    }
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const track = cam.getVideoTracks()[0];
      this.cameraTrack = track;
      this.local.addTrack(track);
      const sender = this.pc?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      else this.pc?.addTrack(track, this.local);
      this.video = true;
      this.ev.onLocalStream(this.local);
      await this.renegotiate();
      void this.sendState();
      return true;
    } catch {
      return false;
    }
  }

  async switchCamera(): Promise<void> {
    const current = this.local?.getVideoTracks()[0];
    if (!current || !this.local) return;
    const facing = current.getSettings().facingMode === "user" ? "environment" : "user";
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      const track = cam.getVideoTracks()[0];
      const sender = this.pc?.getSenders().find((s) => s.track === current);
      await sender?.replaceTrack(track);
      this.local.removeTrack(current);
      current.stop();
      this.local.addTrack(track);
      this.cameraTrack = track;
      this.ev.onLocalStream(this.local);
    } catch {
      /* camera unavailable */
    }
  }

  async shareScreen(on: boolean): Promise<boolean> {
    if (!this.pc || !this.local) return false;
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");
    if (on) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = display.getVideoTracks()[0];
        this.screenTrack = track;
        track.onended = () => void this.shareScreen(false);
        if (sender) await sender.replaceTrack(track);
        else {
          this.pc.addTrack(track, this.local);
          await this.renegotiate();
        }
        void this.sendState();
        return true;
      } catch {
        return false;
      }
    }
    this.screenTrack?.stop();
    this.screenTrack = null;
    const cam = this.cameraTrack ?? this.local.getVideoTracks()[0] ?? null;
    if (sender) await sender.replaceTrack(cam);
    void this.sendState();
    return true;
  }

  private async sendState() {
    if (!this.alive) return;
    const audio = this.local?.getAudioTracks()[0];
    const video = this.local?.getVideoTracks()[0];
    await talkApi
      .signal(this.call.id, {
        kind: "state",
        muted: audio ? !audio.enabled : true,
        camera: !!video && video.enabled && !this.screenTrack,
        screen: !!this.screenTrack,
      } satisfies SignalPayload)
      .catch(() => undefined);
  }

  private async captureMedia() {
    if (this.local) return;
    const constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: this.video ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      this.local = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // Camera refused? Fall back to audio only rather than failing the call.
      this.video = false;
      this.local = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this.cameraTrack = this.local.getVideoTracks()[0] ?? null;
    this.ev.onLocalStream(this.local);
  }

  private ensurePeer(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    // Always negotiate a video m-line so either side can turn the camera on later.
    if (!this.local?.getVideoTracks().length) pc.addTransceiver("video", { direction: "recvonly" });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void talkApi.signal(this.call.id, { kind: "ice", candidate: e.candidate.toJSON() } satisfies SignalPayload).catch(() => undefined);
      }
    };
    const remote = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
      if (!e.streams[0]) remote.addTrack(e.track);
      this.ev.onRemoteStream(remote);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.startedAt ??= Date.now();
        this.setPhase("connected");
      } else if (pc.connectionState === "failed") {
        this.finish("failed");
      } else if (pc.connectionState === "disconnected") {
        window.setTimeout(() => {
          if (this.alive && pc.connectionState === "disconnected") this.finish("disconnected");
        }, 8000);
      }
    };
    return pc;
  }

  private async makeOffer() {
    const pc = this.ensurePeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await talkApi.signal(this.call.id, { kind: "offer", sdp: offer.sdp ?? "" } satisfies SignalPayload);
    this.offerSent = true;
  }

  private async renegotiate() {
    if (!this.pc || this.phase !== "connected") return;
    await this.makeOffer();
  }

  private async handleSignal(payload: SignalPayload) {
    switch (payload.kind) {
      case "offer": {
        const pc = this.ensurePeer();
        await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        await this.flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await talkApi.signal(this.call.id, { kind: "answer", sdp: answer.sdp ?? "" } satisfies SignalPayload);
        break;
      }
      case "answer": {
        const pc = this.ensurePeer();
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
          await this.flushIce();
        }
        break;
      }
      case "ice": {
        const pc = this.ensurePeer();
        if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate).catch(() => undefined);
        else this.pendingIce.push(payload.candidate);
        break;
      }
      case "state":
        this.ev.onPeerState({ muted: !!payload.muted, camera: !!payload.camera, screen: !!payload.screen });
        break;
      case "bye":
        this.finish("remote");
        break;
    }
  }

  private async flushIce() {
    const pc = this.pc;
    if (!pc) return;
    const list = this.pendingIce.splice(0);
    for (const c of list) await pc.addIceCandidate(c).catch(() => undefined);
  }

  private poll() {
    if (this.pollTimer || !this.alive) return;
    const tick = async () => {
      if (!this.alive) return;
      try {
        const data = await talkApi.pollCall(this.call.id, this.cursor);
        this.ev.onCall(data.call);
        if (data.call.status === "declined") return this.finish("declined");
        if (data.call.status === "ended") return this.finish(this.startedAt ? "remote" : "missed");
        if (data.call.status === "active" && this.isCaller && !this.offerSent) {
          this.setPhase("connecting");
          await this.makeOffer();
        }
        for (const s of data.signals) {
          this.cursor = Math.max(this.cursor, s.id);
          await this.handleSignal(s.payload);
        }
      } catch {
        /* transient; next tick retries */
      }
      if (this.alive) this.pollTimer = window.setTimeout(() => void tick(), this.phase === "connected" ? 1500 : 800);
    };
    this.pollTimer = window.setTimeout(() => void tick(), 0);
  }

  private setPhase(phase: CallPhase, reason?: string) {
    if (this.phase === phase && phase !== "ended") return;
    this.phase = phase;
    this.ev.onPhase(phase, reason);
  }

  private finish(reason: string) {
    if (!this.alive) return;
    this.alive = false;
    if (this.pollTimer) window.clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.screenTrack?.stop();
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.pc = null;
    this.ev.onLocalStream(null);
    this.ev.onRemoteStream(null);
    this.setPhase("ended", reason);
  }

  get duration(): number {
    return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
  }
}
