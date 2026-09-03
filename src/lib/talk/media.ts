"use client";

/** Client-side media helpers: compression, recording, base64 transport. */

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/** Downscale + re-encode an image so it travels well; returns JPEG/WebP blob. */
export async function compressImage(
  file: Blob,
  maxSide = 1600,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, width: bitmap.width, height: bitmap.height };
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return { blob: blob ?? file, width, height };
}

/** Square avatar, small enough to live inline in the users table. */
export async function makeAvatarDataUrl(file: Blob, size = 320): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  let q = 0.85;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > 380_000 && q > 0.3) {
    q -= 0.15;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}

export function pickMimeType(candidates: string[]): string {
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

export interface Recording {
  blob: Blob;
  mime: string;
  duration: number;
  waveform: number[];
}

/**
 * Voice-message recorder. Samples the microphone level ~10×/s into a compact
 * waveform (0..31) that the player renders as Telegram-style bars.
 */
export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private levels: number[] = [];
  private timer: number | null = null;
  private startedAt = 0;
  private audioCtx: AudioContext | null = null;
  mime = "";
  onLevel?: (level: number) => void;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.mime = pickMimeType(["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"]);
    this.recorder = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime, audioBitsPerSecond: 48_000 } : undefined);
    this.chunks = [];
    this.levels = [];
    this.recorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
    this.audioCtx = new AudioContext();
    const src = this.audioCtx.createMediaStreamSource(this.stream);
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    this.timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.min(31, Math.round(rms * 140));
      this.levels.push(level);
      this.onLevel?.(level / 31);
    }, 100);
    this.startedAt = Date.now();
    this.recorder.start(250);
  }

  async stop(): Promise<Recording> {
    const rec = this.recorder;
    const duration = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    const blob = await new Promise<Blob>((resolve) => {
      if (!rec || rec.state === "inactive") return resolve(new Blob(this.chunks, { type: this.mime || "audio/webm" }));
      rec.onstop = () => resolve(new Blob(this.chunks, { type: this.mime || "audio/webm" }));
      rec.stop();
    });
    this.cleanup();
    return { blob, mime: this.mime || blob.type || "audio/webm", duration, waveform: downsample(this.levels, 48) };
  }

  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.recorder = null;
  }
}

/** Round video message ("video note"): front camera, square crop, ≤ 60 s. */
export class VideoNoteRecorder {
  private recorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  mime = "";

  async start(): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
      audio: true,
    });
    this.mime = pickMimeType(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"]);
    this.recorder = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime, videoBitsPerSecond: 600_000 } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
    this.startedAt = Date.now();
    this.recorder.start(500);
    return this.stream;
  }

  async stop(): Promise<{ blob: Blob; mime: string; duration: number }> {
    const rec = this.recorder;
    const duration = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    const blob = await new Promise<Blob>((resolve) => {
      if (!rec || rec.state === "inactive") return resolve(new Blob(this.chunks, { type: this.mime || "video/webm" }));
      rec.onstop = () => resolve(new Blob(this.chunks, { type: this.mime || "video/webm" }));
      rec.stop();
    });
    this.cleanup();
    return { blob, mime: this.mime || blob.type || "video/webm", duration };
  }

  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}

export function downsample(values: number[], buckets: number): number[] {
  if (values.length === 0) return Array.from({ length: buckets }, () => 4);
  const out: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const from = Math.floor((i * values.length) / buckets);
    const to = Math.max(from + 1, Math.floor(((i + 1) * values.length) / buckets));
    let max = 0;
    for (let j = from; j < to; j++) max = Math.max(max, values[j] ?? 0);
    out.push(Math.max(2, max));
  }
  return out;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
