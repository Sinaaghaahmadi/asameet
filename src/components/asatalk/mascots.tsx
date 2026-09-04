"use client";

/**
 * "Asa" (آسا) — the Asatalk character: the letter «آ» brought to life. A tall
 * rounded body (the alef stroke), a tilted madd worn like a hat, two dot eyes
 * and a vertical light bar. Glossy, minimal, playful. Drawn inline so it tints
 * with the accent hue, animates with CSS and costs nothing to load.
 *
 * Geometry follows the handoff (viewBox 240×220, shell + eyes reused per pose).
 */
import { cn } from "@/lib/utils";

export type MascotPose =
  | "wave"
  | "love"
  | "sleep"
  | "party"
  | "search"
  | "sad"
  | "lock"
  | "phone"
  | "video"
  | "think"
  | "cool"
  | "laugh"
  | "shush"
  | "megaphone"
  | "group"
  | "thumbs"
  | "angry"
  | "bell";

interface MascotProps {
  pose?: MascotPose;
  size?: number;
  className?: string;
  /** Hue override (defaults to the accent hue). */
  hue?: number;
  animate?: boolean;
}

let uid = 0;
const INK = "#171533";

export function Mascot({ pose = "wave", size = 160, className, hue, animate = true }: MascotProps) {
  const id = `asa${(uid = (uid + 1) % 100000)}`;
  const h = hue ?? "var(--talk-h, 240)";
  const arm = `oklch(0.46 0.16 ${typeof hue === "number" ? hue + 6 : "calc(var(--talk-h, 240) + 6)"})`;
  const hand = `oklch(0.85 0.09 ${typeof hue === "number" ? hue - 2 : "calc(var(--talk-h, 240) - 2)"})`;
  const anim = (cls: string) => (animate ? cls : undefined);

  const eyes = (
    <g className={anim("tg-blink")}>
      <circle cx="78" cy="106" r="11" fill={`url(#${id}-iris)`} />
      <circle cx="122" cy="106" r="11" fill={`url(#${id}-iris)`} />
      <circle cx="82" cy="101" r="3.8" fill="#fff" />
      <circle cx="126" cy="101" r="3.8" fill="#fff" />
    </g>
  );
  const smile = <path d="M82 128 q18 18 36 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />;
  const softSmile = <path d="M86 130 q14 10 28 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />;
  const restingArm = <path d="M150 142 q26 -6 30 -30" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />;
  const spark = (
    <g className={anim("asa-spark")}>
      <path d="M100 8 l4.5 11 11 4.5 -11 4.5 -4.5 11 -4.5-11 -11-4.5 11-4.5z" fill={`url(#${id}-spark)`} />
    </g>
  );

  const face = (() => {
    switch (pose) {
      case "wave":
      case "video":
      case "megaphone":
      case "group":
        return (
          <>
            {spark}
            {eyes}
            {smile}
          </>
        );
      case "love":
        return (
          <>
            <g className={anim("tg-heartbeat")} transform="translate(0 -2)">
              <path d="M78 96 c-9-11-26-4-22 9 3 10 13 15 22 24 9-9 19-14 22-24 4-13-13-20-22-9z" fill="#e11d48" />
              <path d="M122 96 c-9-11-26-4-22 9 3 10 13 15 22 24 9-9 19-14 22-24 4-13-13-20-22-9z" fill="#e11d48" />
              <circle cx="70" cy="98" r="3" fill="#fff" opacity="0.7" />
              <circle cx="114" cy="98" r="3" fill="#fff" opacity="0.7" />
            </g>
            <path d="M84 134 q16 14 32 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
            <g className={anim("tg-confetti")}>
              <path d="M52 44 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z" fill="#fb7185" />
              <circle cx="168" cy="40" r="4" fill="#fbbf24" />
            </g>
          </>
        );
      case "sleep":
        return (
          <>
            <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M66 104 q12 9 24 0" />
              <path d="M110 104 q12 9 24 0" />
            </g>
            <ellipse cx="100" cy="134" rx="7" ry="8" fill={INK} />
            <g fill="none" stroke="#cbd5f5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path className={anim("tg-zzz")} d="M152 66 h14 l-14 14 h14" />
              <path className={anim("tg-zzz")} d="M170 48 h10 l-10 10 h10" />
              <path className={anim("tg-zzz")} d="M184 34 h8 l-8 8 h8" />
            </g>
          </>
        );
      case "party":
      case "laugh":
        return (
          <>
            {eyes}
            <path d="M76 126 q24 28 48 0 z" fill={INK} />
            <path d="M84 134 q16 12 32 0 z" fill="#fb7185" />
            {pose === "party" && (
              <g className={anim("tg-confetti")}>
                <rect x="30" y="72" width="8" height="8" rx="2" fill="#f472b6" transform="rotate(20 34 76)" />
                <rect x="182" y="64" width="8" height="8" rx="2" fill="#34d399" transform="rotate(-30 186 68)" />
                <circle cx="44" cy="26" r="4" fill="#60a5fa" />
                <circle cx="186" cy="22" r="4" fill="#fbbf24" />
                <path d="M112 14 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z" fill="#fde68a" />
              </g>
            )}
          </>
        );
      case "sad":
        return (
          <>
            <path d="M62 92 l24 8 M138 92 l-24 8" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            {eyes}
            <path d="M84 138 q16 -12 32 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
            <ellipse cx="64" cy="132" rx="4" ry="7" fill="#93c5fd" />
          </>
        );
      case "angry":
        return (
          <>
            <path d="M62 88 l26 12 M138 88 l-26 12" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            {eyes}
            <path d="M84 138 q16 -8 32 0" stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none" />
          </>
        );
      case "think":
        return (
          <>
            {eyes}
            <path d="M88 132 q12 -6 24 2" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="160" cy="70" r="4" fill="#fff" fillOpacity="0.8" />
            <circle cx="172" cy="54" r="6" fill="#fff" fillOpacity="0.8" />
            <circle cx="188" cy="34" r="9" fill="#fff" fillOpacity="0.9" />
          </>
        );
      case "cool":
        return (
          <>
            <rect x="60" y="94" width="36" height="22" rx="8" fill={INK} />
            <rect x="104" y="94" width="36" height="22" rx="8" fill={INK} />
            <rect x="96" y="102" width="8" height="4" fill={INK} />
            <path d="M66 100 h12 M110 100 h12" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
            {softSmile}
          </>
        );
      case "shush":
        return (
          <>
            {eyes}
            <circle cx="100" cy="132" r="5" fill={INK} />
          </>
        );
      case "thumbs":
        return (
          <>
            {eyes}
            {smile}
          </>
        );
      default:
        return (
          <>
            {eyes}
            {pose === "search" || pose === "lock" || pose === "bell" ? softSmile : smile}
          </>
        );
    }
  })();

  const rightArm = (() => {
    switch (pose) {
      case "wave":
        return (
          <g className={anim("tg-wave-arm")}>
            <path d="M148 140 q30 -10 34 -44" stroke={arm} strokeWidth="13" strokeLinecap="round" fill="none" />
            <circle cx="184" cy="92" r="12" fill={hand} />
          </g>
        );
      case "party":
        return <path d="M150 142 q30 -10 34 -44" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />;
      case "search":
        return (
          <g>
            <path d="M150 140 q22 -2 28 -24" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="178" cy="84" r="20" fill="#fff" fillOpacity="0.25" stroke={INK} strokeWidth="6" />
            <circle cx="172" cy="78" r="6" fill="#fff" fillOpacity="0.6" />
            <path d="M192 98 l16 16" stroke={INK} strokeWidth="8" strokeLinecap="round" />
          </g>
        );
      case "lock":
        return (
          <g>
            <path d="M150 140 q22 -2 28 -24" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="158" y="86" width="42" height="34" rx="9" fill="#fbbf24" />
            <rect x="158" y="86" width="42" height="12" rx="9" fill="#fde68a" opacity="0.6" />
            <path d="M167 86 v-11 a13 13 0 0 1 26 0 v11" stroke="#92400e" strokeWidth="6" fill="none" />
            <circle cx="179" cy="102" r="4.5" fill="#92400e" />
          </g>
        );
      case "phone":
        return (
          <g className={anim("tg-ring-shake")}>
            <path d="M150 134 q26 -4 30 -26" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="166" y="76" width="27" height="48" rx="8" fill={INK} />
            <rect x="170" y="83" width="19" height="31" rx="3" fill={hand} />
            <path d="M200 70 q10 8 10 22 M207 60 q16 12 16 32" stroke={`oklch(0.7 0.15 ${h})`} strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        );
      case "video":
        return (
          <g>
            <path d="M150 134 q26 -4 30 -26" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="160" y="74" width="36" height="28" rx="7" fill={INK} />
            <path d="M196 82 l14 -8 v30 l-14 -8z" fill={INK} />
            <circle cx="178" cy="88" r="6" fill={hand} />
          </g>
        );
      case "bell":
        return (
          <g className={anim("tg-ring-shake")}>
            <path d="M150 140 q22 -2 28 -24" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M178 62 a17 17 0 0 1 17 17 v14 l7 9 h-48 l7-9 v-14 a17 17 0 0 1 17-17z" fill="#fbbf24" />
            <circle cx="178" cy="108" r="6" fill="#fbbf24" />
          </g>
        );
      case "megaphone":
        return (
          <g>
            <path d="M150 134 q26 -4 30 -26" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M166 90 l34 -18 v56 l-34 -18z" fill={INK} />
            <rect x="156" y="94" width="14" height="16" rx="4" fill="#312e81" />
            <path d="M208 82 q12 14 0 28" stroke={`oklch(0.7 0.16 ${h})`} strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        );
      case "thumbs":
        return (
          <g className={anim("tg-bounce")}>
            <path d="M150 134 q26 -4 30 -26" stroke={arm} strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M166 112 h-8 v-24 h8z M170 88 l8 -20 q6 -4 8 4 l-2 16 h14 q8 0 6 8 l-6 20 q-2 6 -8 6 h-20z" fill={hand} stroke={arm} strokeWidth="3" strokeLinejoin="round" />
          </g>
        );
      case "shush":
        return <path d="M118 118 q10 20 -6 34" stroke={arm} strokeWidth="13" strokeLinecap="round" fill="none" />;
      case "sleep":
      case "sad":
      case "angry":
      case "love":
      case "think":
      case "cool":
      case "laugh":
      default:
        return restingArm;
    }
  })();

  return (
    <svg
      viewBox="0 0 240 220"
      width={size}
      height={(size * 220) / 240}
      className={cn("tg-mascot", animate && pose !== "sleep" && pose !== "party" && "tg-float", animate && pose === "party" && "tg-bounce", className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-b`} cx="33%" cy="26%" r="85%">
          <stop offset="0" stopColor={`oklch(0.9 0.07 ${h})`} />
          <stop offset="0.42" stopColor={`oklch(0.71 0.15 ${h})`} />
          <stop offset="0.78" stopColor={`oklch(0.55 0.17 ${h})`} />
          <stop offset="1" stopColor={`oklch(0.44 0.16 ${h})`} />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-iris`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#3f3a8c" />
          <stop offset="0.6" stopColor="#221e54" />
          <stop offset="1" stopColor="#12102e" />
        </radialGradient>
        <radialGradient id={`${id}-spark`} cx="40%" cy="35%" r="80%">
          <stop offset="0" stopColor="#ffe9b0" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {/* shell: shadow, madd hat, alef body, rim light, light bar, left arm */}
      <ellipse cx="100" cy="200" rx="44" ry="8" fill="#000" fillOpacity="0.22" filter={`url(#${id}-soft)`} />
      <path d="M40 40 q58 -26 118 6" stroke={`url(#${id}-b)`} strokeWidth="21" strokeLinecap="round" fill="none" />
      <rect x="52" y="56" width="96" height="130" rx="48" fill={`url(#${id}-b)`} />
      <path d="M56 128 a44 44 0 0 1 88 -22 a70 70 0 0 0 -88 22z" fill={`url(#${id}-rim)`} />
      <rect x="62" y="66" width="14" height="72" rx="7" fill="#fff" fillOpacity="0.28" />
      {pose !== "group" && <path d="M52 140 q-20 8 -24 30" stroke={arm} strokeWidth="13" strokeLinecap="round" fill="none" />}
      {face}
      {rightArm}
      {pose === "group" && (
        <g>
          <g transform="translate(-52 46) scale(0.55)">
            <rect x="52" y="56" width="96" height="130" rx="48" fill={`oklch(0.7 0.17 ${typeof hue === "number" ? hue + 90 : "calc(var(--talk-h, 240) + 90)"})`} />
            <path d="M40 40 q58 -26 118 6" stroke={`oklch(0.7 0.17 ${typeof hue === "number" ? hue + 90 : "calc(var(--talk-h, 240) + 90)"})`} strokeWidth="21" strokeLinecap="round" fill="none" />
            <circle cx="78" cy="106" r="10" fill={INK} />
            <circle cx="122" cy="106" r="10" fill={INK} />
            <path d="M82 128 q18 16 36 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          <g transform="translate(120 46) scale(0.55)">
            <rect x="52" y="56" width="96" height="130" rx="48" fill={`oklch(0.72 0.17 ${typeof hue === "number" ? hue - 90 : "calc(var(--talk-h, 240) - 90)"})`} />
            <path d="M40 40 q58 -26 118 6" stroke={`oklch(0.72 0.17 ${typeof hue === "number" ? hue - 90 : "calc(var(--talk-h, 240) - 90)"})`} strokeWidth="21" strokeLinecap="round" fill="none" />
            <circle cx="78" cy="106" r="10" fill={INK} />
            <circle cx="122" cy="106" r="10" fill={INK} />
            <path d="M82 128 q18 16 36 0" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </g>
      )}
    </svg>
  );
}

/** Brand mark: the Asa «A» with its spark inside the talk bubble. */
export function AsatalkLogo({ size = 40, className }: { size?: number; className?: string }) {
  const id = `atl${(uid = (uid + 1) % 100000)}`;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.8 0.12 var(--talk-h, 240))" />
          <stop offset="0.55" stopColor="oklch(0.62 0.17 var(--talk-h, 240))" />
          <stop offset="1" stopColor="oklch(0.48 0.17 var(--talk-h, 240))" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="248" r="216" fill={`url(#${id}-g)`} />
      <path d="M118 402 L88 478 L188 428 Z" fill="oklch(0.48 0.17 var(--talk-h, 240))" />
      <path d="M256 32 a216 216 0 0 1 216 216 c0 18 -3 36 -8 52 C380 200 300 170 60 300 40 210 110 32 256 32z" fill={`url(#${id}-s)`} />
      <path d="M150 352 L256 140 L362 352 H312 L256 234 L200 352 Z" fill="#fff" />
      <circle cx="256" cy="104" r="18" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}
