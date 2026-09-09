"use client";

/**
 * Group calls as a full mesh.
 *
 * There is no media server in this stack, so every participant keeps one
 * peer connection per other participant. That is fine for the handful of
 * people a family or team group actually calls with at once, and it reuses
 * the database mailbox already used for 1:1 — signals simply carry a
 * recipient now, and the roster comes back on the same poll.
 *
 * Glare is avoided without perfect-negotiation bookkeeping: for any pair the
 * participant with the smaller id is the only one that ever offers.
 */
import { talkApi, type SignalPayload } from "./api";
import { getCallMedia } from "./webrtc";
import type { Call } from "@/lib/types";

export type GroupPhase = "connecting" | "connected" | "ended";

export interface GroupPeer {
  userId: string;
  stream: MediaStream | null;
  connected: boolean;
  muted: boolean;
  camera: boolean;
}

export interface GroupEvents {
  onPhase: (phase: GroupPhase, reason?: string) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onPeers: (peers: GroupPeer[]) => void;
  onCall: (call: Call) => void;
}

interface Link {
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingIce: RTCIceCandidateInit[];
  offerer: boolean;
  connected: boolean;
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

export class GroupCallSession {
  call: Call;
  video: boolean;
  phase: GroupPhase = "connecting";
  startedAt: number | null = null;

  private local: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private links = new Map<string, Link>();
  private roster = new Map<string, { muted: boolean; camera: boolean }>();
  private cursor = 0;
  private pollTimer: number | null = null;
  private alive = true;
  private muted = false;

  constructor(
    call: Call,
    private readonly myId: string,
    private readonly ev: GroupEvents,
  ) {
    this.call = call;
    this.video = call.type === "video";
  }

  async begin(): Promise<void> {
    const got = await getCallMedia(this.video);
    this.local = got.stream;
    this.video = got.video;
    this.cameraTrack = this.local.getVideoTracks()[0] ?? null;
    this.ev.onLocalStream(this.local);
    this.setPhase("connecting");
    this.poll();
    void this.publish();
  }

  get localStream() {
    return this.local;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    void this.publish();
  }

  setCamera(on: boolean) {
    this.local?.getVideoTracks().forEach((t) => (t.enabled = on));
    void this.publish();
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
    } catch {
      return false;
    }
    const track = cam.getVideoTracks()[0];
    this.cameraTrack = track;
    this.local.addTrack(track);
    this.video = true;
    // Every leg of the mesh needs the new track and a fresh offer.
    for (const [peerId, link] of this.links) {
      const sender = link.pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      else link.pc.addTrack(track, this.local);
      if (link.offerer) await this.offer(peerId).catch(() => undefined);
    }
    this.ev.onLocalStream(this.local);
    void this.publish();
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
      for (const link of this.links.values()) {
        const sender = link.pc.getSenders().find((s) => s.track === current);
        await sender?.replaceTrack(track);
      }
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
    if (!this.local) return false;
    if (on) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const track = display.getVideoTracks()[0];
        this.screenTrack = track;
        track.onended = () => void this.shareScreen(false);
        for (const link of this.links.values()) {
          const sender = link.pc
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(track);
          else link.pc.addTrack(track, this.local);
        }
        return true;
      } catch {
        return false;
      }
    }
    this.screenTrack?.stop();
    this.screenTrack = null;
    const cam = this.cameraTrack ?? null;
    for (const link of this.links.values()) {
      const sender = link.pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(cam);
    }
    return true;
  }

  async leave(): Promise<void> {
    for (const peerId of this.links.keys())
      await talkApi
        .signal(this.call.id, { kind: "bye" } satisfies SignalPayload, peerId)
        .catch(() => undefined);
    await talkApi.leaveCall(this.call.id).catch(() => undefined);
    this.finish("hangup");
  }

  get duration(): number {
    return this.startedAt
      ? Math.round((Date.now() - this.startedAt) / 1000)
      : 0;
  }

  /* ------------------------------------------------------------ internals */

  private publish() {
    const video = this.local?.getVideoTracks()[0];
    return talkApi
      .callPresence(this.call.id, {
        muted: this.muted,
        camera: !!video && video.enabled,
      })
      .catch(() => undefined);
  }

  private link(peerId: string): Link {
    const existing = this.links.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({
      iceServers: iceServers(),
      bundlePolicy: "max-bundle",
    });
    const stream = new MediaStream();
    // Deterministic roles: the smaller id offers, the larger one answers.
    const link: Link = {
      pc,
      stream,
      pendingIce: [],
      offerer: this.myId < peerId,
      connected: false,
    };
    this.links.set(peerId, link);

    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    if (!this.local?.getVideoTracks().length)
      pc.addTransceiver("video", { direction: "sendrecv" });

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      void talkApi
        .signal(
          this.call.id,
          {
            kind: "ice",
            candidate: e.candidate.toJSON(),
          } satisfies SignalPayload,
          peerId,
        )
        .catch(() => undefined);
    };
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => stream.addTrack(t));
      if (!e.streams[0]) stream.addTrack(e.track);
      this.emitPeers();
    };
    const settle = () => {
      const st = pc.connectionState;
      const ice = pc.iceConnectionState;
      link.connected =
        st === "connected" || ice === "connected" || ice === "completed";
      if (link.connected) {
        this.startedAt ??= Date.now();
        this.setPhase("connected");
      }
      if (st === "failed" || ice === "failed") this.drop(peerId);
      this.emitPeers();
    };
    pc.onconnectionstatechange = settle;
    pc.oniceconnectionstatechange = settle;
    return link;
  }

  private async offer(peerId: string) {
    const link = this.link(peerId);
    const offer = await link.pc.createOffer();
    await link.pc.setLocalDescription(offer);
    await talkApi.signal(
      this.call.id,
      { kind: "offer", sdp: offer.sdp ?? "" } satisfies SignalPayload,
      peerId,
    );
  }

  private drop(peerId: string) {
    const link = this.links.get(peerId);
    if (!link) return;
    try {
      link.pc.close();
    } catch {
      /* already closed */
    }
    this.links.delete(peerId);
    this.emitPeers();
  }

  private async handle(from: string, payload: SignalPayload) {
    switch (payload.kind) {
      case "offer": {
        const link = this.link(from);
        await link.pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        await this.flush(link);
        const answer = await link.pc.createAnswer();
        await link.pc.setLocalDescription(answer);
        await talkApi.signal(
          this.call.id,
          { kind: "answer", sdp: answer.sdp ?? "" } satisfies SignalPayload,
          from,
        );
        break;
      }
      case "answer": {
        const link = this.links.get(from);
        if (link?.pc.signalingState === "have-local-offer") {
          await link.pc.setRemoteDescription({
            type: "answer",
            sdp: payload.sdp,
          });
          await this.flush(link);
        }
        break;
      }
      case "ice": {
        const link = this.link(from);
        if (link.pc.remoteDescription)
          await link.pc
            .addIceCandidate(payload.candidate)
            .catch(() => undefined);
        else link.pendingIce.push(payload.candidate);
        break;
      }
      case "bye":
        this.drop(from);
        break;
      default:
        break;
    }
  }

  private async flush(link: Link) {
    for (const c of link.pendingIce.splice(0))
      await link.pc.addIceCandidate(c).catch(() => undefined);
  }

  private poll() {
    if (this.pollTimer || !this.alive) return;
    const tick = async () => {
      if (!this.alive) return;
      try {
        const data = await talkApi.pollCall(this.call.id, this.cursor);
        this.call = data.call;
        this.ev.onCall(data.call);
        if (data.call.status === "ended") return this.finish("remote");

        // Reconcile the mesh against the roster the server just sent.
        const joined = new Set<string>();
        this.roster.clear();
        for (const p of data.call.participants) {
          if (p.userId === this.myId) continue;
          this.roster.set(p.userId, { muted: p.muted, camera: p.camera });
          if (p.state !== "joined") continue;
          joined.add(p.userId);
          if (!this.links.has(p.userId)) {
            const link = this.link(p.userId);
            if (link.offerer) await this.offer(p.userId).catch(() => undefined);
          }
        }
        for (const peerId of [...this.links.keys()])
          if (!joined.has(peerId)) this.drop(peerId);

        for (const s of data.signals) {
          this.cursor = Math.max(this.cursor, s.id);
          await this.handle(s.from, s.payload);
        }
        this.emitPeers();
      } catch {
        /* transient; the next tick retries */
      }
      if (this.alive)
        this.pollTimer = window.setTimeout(
          () => void tick(),
          this.phase === "connected" ? 1800 : 900,
        );
    };
    this.pollTimer = window.setTimeout(() => void tick(), 0);
  }

  private emitPeers() {
    const peers: GroupPeer[] = [];
    for (const [userId, link] of this.links) {
      const meta = this.roster.get(userId);
      peers.push({
        userId,
        stream: link.stream.getTracks().length ? link.stream : null,
        connected: link.connected,
        muted: meta?.muted ?? false,
        camera: meta?.camera ?? false,
      });
    }
    this.ev.onPeers(peers);
  }

  private setPhase(phase: GroupPhase, reason?: string) {
    if (this.phase === phase && phase !== "ended") return;
    this.phase = phase;
    this.ev.onPhase(phase, reason);
  }

  private finish(reason: string) {
    if (!this.alive) return;
    this.alive = false;
    if (this.pollTimer) window.clearTimeout(this.pollTimer);
    this.pollTimer = null;
    for (const link of this.links.values()) {
      try {
        link.pc.close();
      } catch {
        /* already closed */
      }
    }
    this.links.clear();
    this.screenTrack?.stop();
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    this.ev.onLocalStream(null);
    this.ev.onPeers([]);
    this.setPhase("ended", reason);
  }
}
