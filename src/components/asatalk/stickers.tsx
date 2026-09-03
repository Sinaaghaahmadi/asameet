"use client";

import { Mascot, type MascotPose } from "./mascots";

/** Built-in "Asa" sticker pack — sent as type "sticker" with the pose id. */
export const STICKER_PACK: { id: string; pose: MascotPose; hue?: number }[] = [
  { id: "wave", pose: "wave" },
  { id: "love", pose: "love", hue: 350 },
  { id: "party", pose: "party", hue: 300 },
  { id: "sleep", pose: "sleep", hue: 270 },
  { id: "laugh", pose: "laugh", hue: 80 },
  { id: "think", pose: "think", hue: 200 },
  { id: "cool", pose: "cool", hue: 240 },
  { id: "sad", pose: "sad", hue: 220 },
  { id: "call", pose: "phone", hue: 150 },
  { id: "thumbs", pose: "thumbs", hue: 130 },
  { id: "shush", pose: "shush", hue: 320 },
  { id: "angry", pose: "angry", hue: 25 },
];

export function Sticker({ id, size = 160, animate = true }: { id: string; size?: number; animate?: boolean }) {
  const s = STICKER_PACK.find((x) => x.id === id) ?? STICKER_PACK[0];
  return <Mascot pose={s.pose} hue={s.hue} size={size} animate={animate} />;
}
