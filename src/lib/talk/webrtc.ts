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
  // Only a configured TURN is added: unreachable relays slow ICE gathering
  // down (each allocation has to time out) and can push the connection to
  // "failed" on networks where the direct path would have worked.
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

export class MediaAccessError extends Error {
  constructor(
    public kind: "denied" | "notfound" | "busy" | "insecure" | "unknown",
    message?: string,
  ) {
    super(message ?? kind);
  }
}

function classify(e: unknown): MediaAccessError {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return new MediaAccessError("denied");
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    name === "DevicesNotFoundError"
  )
    return new MediaAccessError("notfound");
  if (
    name === "NotReadableError" ||
    name === "AbortError" ||
    name === "TrackStartError"
  )
    return new MediaAccessError("busy");
  return new MediaAccessError(
    "unknown",
    e instanceof Error ? e.message : String(e),
  );
}

/** Camera + mic with graceful degradation; throws MediaAccessError on hard failure. */
export async function getCallMedia(
  video: boolean,
): Promise<{ stream: MediaStream; video: boolean }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    throw new MediaAccessError("insecure");
  const audio: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (video) {
    const attempts: MediaStreamConstraints[] = [
      {
        audio,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio, video: { facingMode: "user" } },
      { audio, video: true },
    ];
    let lastErr: unknown = null;
    for (const c of attempts) {
      try {
        return {
          stream: await navigator.mediaDevices.getUserMedia(c),
          video: true,
        };
      } catch (e) {
        lastErr = e;
        if (classify(e).kind === "denied") throw classify(e);
      }
    }
    // No camera (or it is busy): keep the call alive as audio-only.
    try {
      return {
        stream: await navigator.mediaDevices.getUserMedia({ audio }),
        video: false,
      };
    } catch {
      throw classify(lastErr);
    }
  }
  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia({ audio }),
      video: false,
    };
  } catch (e) {
    throw classify(e);
  }
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
  private negotiatedAt: number | null = null;
  private restarts = 0;
  private watchdog: number | null = null;
  private dropTimer: number | null = null;
  phase: CallPhase = "ringing";
  video: boolean;
  startedAt: number | null = null;

  constructor(
    call: Call,
    private readonly myId: string,
    private readonly ev: SessionEvents,
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
    const duration = this.startedAt
      ? Math.round((Date.now() - this.startedAt) / 1000)
      : 0;
    await talkApi
      .signal(this.call.id, { kind: "bye" } satisfies SignalPayload)
      .catch(() => undefined);
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
    let cam: MediaStream;
    try {
      cam = await navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
    } catch (e) {
      throw classify(e);
    }
    const track = cam.getVideoTracks()[0];
    this.cameraTrack = track;
    this.local.addTrack(track);
    const sender = this.pc
      ?.getSenders()
      .find(
        (s) =>
          s.track?.kind === "video" ||
          (s.track === null &&
            this.pc
              ?.getTransceivers()
              .some(
                (t) => t.sender === s && t.receiver.track.kind === "video",
              )),
      );
    if (sender) await sender.replaceTrack(track);
    else this.pc?.addTrack(track, this.local);
    this.video = true;
    this.ev.onLocalStream(this.local);
    await this.renegotiate();
    void this.sendState();
    return true;
  }

  async switchCamera(): Promise<void> {
    const current = this.local?.getVideoTracks()[0];
    if (!current || !this.local) return;
    const facing =
      current.getSettings().facingMode === "user" ? "environment" : "user";
    try {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
      });
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
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
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
    const got = await getCallMedia(this.video);
    this.local = got.stream;
    this.video = got.video;
    this.cameraTrack = this.local.getVideoTracks()[0] ?? null;
    this.ev.onLocalStream(this.local);
  }

  private ensurePeer(): RTCPeerConnection {
    if (this.pc) return this.pc;
    // max-bundle keeps audio and video on a single ICE/DTLS transport: with a
    // polled signalling channel that is both faster to connect and immune to a
    // second, media-less m-line holding `connectionState` at "connecting".
    const pc = new RTCPeerConnection({
      iceServers: iceServers(),
      bundlePolicy: "max-bundle",
    });
    this.pc = pc;
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    // Always negotiate a video m-line so either side can turn the camera on later.
    if (!this.local?.getVideoTracks().length)
      pc.addTransceiver("video", { direction: "sendrecv" });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void talkApi
          .signal(this.call.id, {
            kind: "ice",
            candidate: e.candidate.toJSON(),
          } satisfies SignalPayload)
          .catch(() => undefined);
      }
    };
    const remote = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
      if (!e.streams[0]) remote.addTrack(e.track);
      const notify = () => this.ev.onRemoteStream(remote);
      e.track.onunmute = notify;
      e.track.onmute = notify;
      e.track.onended = notify;
      notify();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") this.markConnected();
      else if (pc.connectionState === "failed") this.recover("failed");
      else if (pc.connectionState === "disconnected") this.scheduleDrop();
    };
    // Some browsers keep `connectionState` at "connecting" even after media
    // flows, so the ICE transport is the second (and earlier) signal.
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "connected" || st === "completed") this.markConnected();
      else if (st === "failed") this.recover("failed");
      else if (st === "disconnected") this.scheduleDrop();
    };
    return pc;
  }

  private markConnected() {
    if (!this.alive) return;
    if (this.dropTimer) {
      window.clearTimeout(this.dropTimer);
      this.dropTimer = null;
    }
    this.clearWatchdog();
    this.startedAt ??= Date.now();
    if (this.phase !== "connected") {
      this.setPhase("connected");
      void this.sendState();
    }
  }

  private scheduleDrop() {
    if (this.dropTimer || !this.alive) return;
    this.dropTimer = window.setTimeout(() => {
      this.dropTimer = null;
      const st = this.pc?.iceConnectionState;
      if (this.alive && (st === "disconnected" || st === "failed"))
        this.recover("disconnected");
    }, 10_000);
  }

  /** A broken path is retried with an ICE restart before the call is dropped. */
  private recover(reason: string) {
    if (!this.alive) return;
    if (this.restarts >= 2) return this.finish(reason);
    this.restarts++;
    this.armWatchdog();
    if (this.isCaller) void this.makeOffer(true).catch(() => undefined);
    else
      void talkApi
        .signal(this.call.id, { kind: "restart" } satisfies SignalPayload)
        .catch(() => undefined);
  }

  /** Negotiation that never reaches a connected transport is retried, then failed. */
  private armWatchdog() {
    this.clearWatchdog();
    this.negotiatedAt ??= Date.now();
    this.watchdog = window.setTimeout(() => {
      this.watchdog = null;
      if (!this.alive || this.phase === "connected") return;
      const waited = Date.now() - (this.negotiatedAt ?? Date.now());
      if (this.restarts < 2 && waited < 45_000) this.recover("stalled");
      else this.finish("failed");
    }, 15_000);
  }

  private clearWatchdog() {
    if (this.watchdog) window.clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private async makeOffer(iceRestart = false) {
    const pc = this.ensurePeer();
    const offer = await pc.createOffer(
      iceRestart ? { iceRestart: true } : undefined,
    );
    await pc.setLocalDescription(offer);
    await talkApi.signal(this.call.id, {
      kind: "offer",
      sdp: offer.sdp ?? "",
    } satisfies SignalPayload);
    this.offerSent = true;
    this.armWatchdog();
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
        await talkApi.signal(this.call.id, {
          kind: "answer",
          sdp: answer.sdp ?? "",
        } satisfies SignalPayload);
        this.armWatchdog();
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
        if (pc.remoteDescription)
          await pc.addIceCandidate(payload.candidate).catch(() => undefined);
        else this.pendingIce.push(payload.candidate);
        break;
      }
      case "state":
        this.ev.onPeerState({
          muted: !!payload.muted,
          camera: !!payload.camera,
          screen: !!payload.screen,
        });
        break;
      case "restart":
        if (this.isCaller && this.phase !== "ended")
          await this.makeOffer(true).catch(() => undefined);
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
        if (data.call.status === "ended")
          return this.finish(this.startedAt ? "remote" : "missed");
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
      if (this.alive)
        this.pollTimer = window.setTimeout(
          () => void tick(),
          this.phase === "connected" ? 1500 : 800,
        );
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
    this.clearWatchdog();
    if (this.dropTimer) window.clearTimeout(this.dropTimer);
    this.dropTimer = null;
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
    return this.startedAt
      ? Math.round((Date.now() - this.startedAt) / 1000)
      : 0;
  }
}
