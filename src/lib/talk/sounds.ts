"use client";

/**
 * Synthesised UI sounds (no audio assets): ringtone, dial tone, message
 * pops. Everything is generated with the Web Audio API on demand.
 */

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, gain = 0.08, type: OscillatorType = "sine") {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playPop() {
  const ac = audio();
  if (!ac) return;
  tone(880, ac.currentTime, 0.08, 0.05);
  tone(1320, ac.currentTime + 0.05, 0.1, 0.04);
}

export function playSent() {
  const ac = audio();
  if (!ac) return;
  tone(660, ac.currentTime, 0.06, 0.04, "triangle");
}

export function playIncomingMessage() {
  const ac = audio();
  if (!ac) return;
  tone(988, ac.currentTime, 0.12, 0.06);
  tone(1319, ac.currentTime + 0.1, 0.16, 0.05);
}

/** Looping melodic ringtone; returns a stop function. */
export function startRingtone(): () => void {
  const ac = audio();
  if (!ac) return () => undefined;
  let stopped = false;
  let timer: number | null = null;
  const loop = () => {
    if (stopped) return;
    const t = ac.currentTime;
    const notes = [659, 784, 988, 784, 659, 784, 988, 1175];
    notes.forEach((f, i) => tone(f, t + i * 0.16, 0.14, 0.07, "triangle"));
    timer = window.setTimeout(loop, 2400);
  };
  loop();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
  };
}

/** Outgoing "ring-ring" heard by the caller while the callee's phone rings. */
export function startDialTone(): () => void {
  const ac = audio();
  if (!ac) return () => undefined;
  let stopped = false;
  let timer: number | null = null;
  const loop = () => {
    if (stopped) return;
    const t = ac.currentTime;
    tone(440, t, 0.9, 0.05);
    tone(480, t, 0.9, 0.05);
    timer = window.setTimeout(loop, 3000);
  };
  loop();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
  };
}

export function playCallEnd() {
  const ac = audio();
  if (!ac) return;
  tone(520, ac.currentTime, 0.15, 0.06);
  tone(390, ac.currentTime + 0.16, 0.25, 0.06);
}

export function playConnected() {
  const ac = audio();
  if (!ac) return;
  tone(523, ac.currentTime, 0.1, 0.06);
  tone(784, ac.currentTime + 0.1, 0.18, 0.06);
}

/** Unlock audio on the first user gesture (mobile browsers). */
export function primeAudio() {
  audio();
}
