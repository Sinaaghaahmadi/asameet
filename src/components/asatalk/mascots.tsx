"use client";

/**
 * "Asa" — the Asatalk mascot family. Round, glossy, vector characters drawn
 * inline so they tint with the accent (currentColor / CSS vars), animate
 * with CSS and cost nothing to load. Every pose is the same body with
 * different eyes, mouth, arms and props.
 */
import { cn } from "@/lib/utils";

export type MascotPose =
  | "wave"
  | "phone"
  | "sleep"
  | "party"
  | "love"
  | "laugh"
  | "think"
  | "cool"
  | "sad"
  | "shush"
  | "megaphone"
  | "group"
  | "search"
  | "lock"
  | "thumbs"
  | "angry"
  | "video";

interface MascotProps {
  pose?: MascotPose;
  size?: number;
  className?: string;
  /** Hue override (defaults to the accent); use for group scenes. */
  hue?: number;
  animate?: boolean;
}

let uid = 0;

export function Mascot({ pose = "wave", size = 160, className, hue, animate = true }: MascotProps) {
  const id = `asa-${pose}-${(uid = (uid + 1) % 10000)}`;
  const h = hue ?? "var(--talk-h, 240)";
  const body = `oklch(0.68 0.16 ${h})`;
  const bodyDark = `oklch(0.52 0.17 ${h})`;
  const bodyLight = `oklch(0.84 0.1 ${h})`;
  const cheek = `oklch(0.75 0.16 15 / 0.7)`;

  const eyes = (() => {
    switch (pose) {
      case "sleep":
        return (
          <g stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M68 92 q10 8 20 0" />
            <path d="M112 92 q10 8 20 0" />
          </g>
        );
      case "laugh":
        return (
          <g stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M66 94 q12 -14 24 0" />
            <path d="M110 94 q12 -14 24 0" />
          </g>
        );
      case "love":
        return (
          <g fill="#e11d48" className={animate ? "tg-heartbeat" : undefined}>
            <path d="M78 82 c-8-10-24-4-20 8 3 9 12 14 20 22 8-8 17-13 20-22 4-12-12-18-20-8z" />
            <path d="M122 82 c-8-10-24-4-20 8 3 9 12 14 20 22 8-8 17-13 20-22 4-12-12-18-20-8z" />
          </g>
        );
      case "cool":
        return (
          <g>
            <rect x="56" y="78" width="40" height="24" rx="8" fill="#1e1b4b" />
            <rect x="104" y="78" width="40" height="24" rx="8" fill="#1e1b4b" />
            <rect x="96" y="86" width="8" height="4" fill="#1e1b4b" />
            <path d="M62 84 h14" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
            <path d="M110 84 h14" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case "angry":
        return (
          <g>
            <g className={animate ? "tg-blink" : undefined}>
              <circle cx="78" cy="96" r="11" fill="#1e1b4b" />
              <circle cx="122" cy="96" r="11" fill="#1e1b4b" />
              <circle cx="82" cy="92" r="3.5" fill="#fff" />
              <circle cx="126" cy="92" r="3.5" fill="#fff" />
            </g>
            <path d="M62 76 l26 10 M138 76 l-26 10" stroke="#1e1b4b" strokeWidth="6" strokeLinecap="round" />
          </g>
        );
      case "sad":
        return (
          <g>
            <g className={animate ? "tg-blink" : undefined}>
              <circle cx="78" cy="96" r="12" fill="#1e1b4b" />
              <circle cx="122" cy="96" r="12" fill="#1e1b4b" />
              <circle cx="82" cy="92" r="4" fill="#fff" />
              <circle cx="126" cy="92" r="4" fill="#fff" />
            </g>
            <path d="M64 80 l22 6 M136 80 l-22 6" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="66" cy="118" rx="4" ry="7" fill="#93c5fd" />
          </g>
        );
      default:
        return (
          <g className={animate ? "tg-blink" : undefined}>
            <circle cx="78" cy="94" r="13" fill="#1e1b4b" />
            <circle cx="122" cy="94" r="13" fill="#1e1b4b" />
            <circle cx="83" cy="89" r="4.5" fill="#fff" />
            <circle cx="127" cy="89" r="4.5" fill="#fff" />
          </g>
        );
    }
  })();

  const mouth = (() => {
    switch (pose) {
      case "sleep":
        return <ellipse cx="100" cy="122" rx="6" ry="7" fill="#1e1b4b" />;
      case "laugh":
      case "party":
        return (
          <g>
            <path d="M76 114 q24 30 48 0 z" fill="#1e1b4b" />
            <path d="M84 122 q16 14 32 0 z" fill="#fb7185" />
          </g>
        );
      case "love":
        return <path d="M84 118 q16 16 32 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />;
      case "think":
        return <path d="M88 122 q12 -6 24 2" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />;
      case "sad":
        return <path d="M84 126 q16 -12 32 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />;
      case "angry":
        return <path d="M84 126 q16 -8 32 0" stroke="#1e1b4b" strokeWidth="6" strokeLinecap="round" fill="none" />;
      case "shush":
        return <circle cx="100" cy="122" r="5" fill="#1e1b4b" />;
      case "cool":
        return <path d="M86 120 q14 10 28 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />;
      default:
        return <path d="M82 116 q18 18 36 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />;
    }
  })();

  const props = (() => {
    switch (pose) {
      case "wave":
        return (
          <g className={animate ? "tg-wave-arm" : undefined}>
            <path d="M150 128 q30 -10 34 -44" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="186" cy="80" r="13" fill={bodyLight} />
          </g>
        );
      case "phone":
        return (
          <g className={animate ? "tg-ring-shake" : undefined}>
            <path d="M150 120 q26 -4 30 -26" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="166" y="66" width="26" height="46" rx="7" fill="#1e1b4b" />
            <rect x="170" y="72" width="18" height="30" rx="3" fill={`oklch(0.85 0.1 ${h})`} />
            <path d="M200 60 q10 8 10 22 M206 50 q16 12 16 32" stroke={`oklch(0.7 0.16 ${h})`} strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        );
      case "video":
        return (
          <g>
            <path d="M150 120 q26 -4 30 -26" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="160" y="66" width="34" height="26" rx="6" fill="#1e1b4b" />
            <path d="M194 74 l14 -8 v28 l-14 -8z" fill="#1e1b4b" />
            <circle cx="177" cy="79" r="6" fill={`oklch(0.85 0.1 ${h})`} />
          </g>
        );
      case "sleep":
        return (
          <g fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path className={animate ? "tg-zzz" : undefined} d="M150 60 h14 l-14 14 h14" />
            <path className={animate ? "tg-zzz" : undefined} d="M166 44 h10 l-10 10 h10" />
            <path className={animate ? "tg-zzz" : undefined} d="M178 32 h8 l-8 8 h8" />
          </g>
        );
      case "party":
        return (
          <g>
            <path d="M100 42 l-26 -34 h52 z" fill={`oklch(0.7 0.2 ${Number(hue ?? 240) + 120})`} />
            <path d="M100 42 l-13 -17 h26 z" fill="#fff" fillOpacity="0.5" />
            <circle cx="100" cy="8" r="6" fill="#fbbf24" />
            <g className={animate ? "tg-confetti" : undefined}>
              <rect x="30" y="60" width="8" height="8" rx="2" fill="#f472b6" transform="rotate(20 34 64)" />
              <rect x="170" y="50" width="8" height="8" rx="2" fill="#34d399" transform="rotate(-30 174 54)" />
              <circle cx="50" cy="40" r="4" fill="#60a5fa" />
              <circle cx="160" cy="30" r="4" fill="#fbbf24" />
            </g>
          </g>
        );
      case "think":
        return (
          <g>
            <path d="M136 132 q20 4 26 -14" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="160" cy="60" r="4" fill="#fff" fillOpacity="0.8" />
            <circle cx="172" cy="46" r="6" fill="#fff" fillOpacity="0.8" />
            <circle cx="188" cy="28" r="9" fill="#fff" fillOpacity="0.9" />
          </g>
        );
      case "shush":
        return <path d="M118 108 q10 20 -6 34" stroke={bodyDark} strokeWidth="13" strokeLinecap="round" fill="none" />;
      case "megaphone":
        return (
          <g>
            <path d="M150 124 q22 -2 30 -20" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M168 78 l34 -18 v56 l-34 -18z" fill="#1e1b4b" />
            <rect x="158" y="82" width="14" height="16" rx="4" fill="#312e81" />
            <path d="M210 70 q12 14 0 28" stroke={`oklch(0.7 0.16 ${h})`} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M218 60 q22 24 0 48" stroke={`oklch(0.7 0.16 ${h})`} strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        );
      case "search":
        return (
          <g>
            <path d="M150 124 q22 -2 28 -24" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="178" cy="70" r="20" fill="#fff" fillOpacity="0.35" stroke="#1e1b4b" strokeWidth="6" />
            <path d="M192 84 l16 16" stroke="#1e1b4b" strokeWidth="8" strokeLinecap="round" />
          </g>
        );
      case "lock":
        return (
          <g>
            <path d="M150 124 q22 -2 28 -24" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="160" y="74" width="40" height="32" rx="8" fill="#fbbf24" />
            <path d="M168 74 v-10 a12 12 0 0 1 24 0 v10" stroke="#92400e" strokeWidth="6" fill="none" />
            <circle cx="180" cy="90" r="4" fill="#92400e" />
          </g>
        );
      case "thumbs":
        return (
          <g className={animate ? "tg-bounce" : undefined}>
            <path d="M150 124 q22 -2 28 -24" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M166 100 h-8 v-24 h8z M170 76 l8 -20 q6 -4 8 4 l-2 16 h14 q8 0 6 8 l-6 20 q-2 6 -8 6 h-20z" fill={bodyLight} stroke={bodyDark} strokeWidth="3" strokeLinejoin="round" />
          </g>
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox="0 0 240 200"
      width={size}
      height={(size * 200) / 240}
      className={cn("tg-mascot", animate && "tg-float", className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={bodyLight} />
          <stop offset="0.55" stopColor={body} />
          <stop offset="1" stopColor={bodyDark} />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {/* ground shadow */}
      <ellipse cx="100" cy="186" rx="52" ry="8" fill="#000" fillOpacity="0.15" filter={`url(#${id}-soft)`} />
      {/* body: a plump speech bubble */}
      <path
        d="M40 96 C40 52 68 34 100 34 C132 34 160 52 160 96 C160 134 134 156 106 158 L92 178 L86 158 C62 154 40 134 40 96 Z"
        fill={`url(#${id}-body)`}
      />
      <path d="M52 86 C54 58 74 44 100 44 C124 44 142 56 148 80 C120 66 78 66 52 86Z" fill={`url(#${id}-shine)`} />
      {/* glass rim */}
      <path
        d="M40 96 C40 52 68 34 100 34 C132 34 160 52 160 96 C160 134 134 156 106 158 L92 178 L86 158 C62 154 40 134 40 96 Z"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      {/* cheeks */}
      <ellipse cx="64" cy="112" rx="9" ry="5" fill={cheek} />
      <ellipse cx="136" cy="112" rx="9" ry="5" fill={cheek} />
      {/* left arm */}
      {pose !== "group" && (
        <path d="M50 126 q-18 6 -22 26" stroke={bodyDark} strokeWidth="14" strokeLinecap="round" fill="none" />
      )}
      {eyes}
      {mouth}
      {props}
      {pose === "group" && (
        <g>
          <g transform="translate(-58 30) scale(0.62)">
            <path
              d="M40 96 C40 52 68 34 100 34 C132 34 160 52 160 96 C160 134 134 156 106 158 L92 178 L86 158 C62 154 40 134 40 96 Z"
              fill={`oklch(0.7 0.17 ${Number(hue ?? 240) + 90})`}
            />
            <circle cx="78" cy="94" r="12" fill="#1e1b4b" />
            <circle cx="122" cy="94" r="12" fill="#1e1b4b" />
            <path d="M82 118 q18 16 36 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          <g transform="translate(120 30) scale(0.62)">
            <path
              d="M40 96 C40 52 68 34 100 34 C132 34 160 52 160 96 C160 134 134 156 106 158 L92 178 L86 158 C62 154 40 134 40 96 Z"
              fill={`oklch(0.72 0.17 ${Number(hue ?? 240) - 90})`}
            />
            <circle cx="78" cy="94" r="12" fill="#1e1b4b" />
            <circle cx="122" cy="94" r="12" fill="#1e1b4b" />
            <path d="M82 118 q18 16 36 0" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </g>
      )}
    </svg>
  );
}

/** Small brand mark: a glossy bubble with an "A" spark. */
export function AsatalkLogo({ size = 40, className }: { size?: number; className?: string }) {
  const id = `atl-${(uid = (uid + 1) % 10000)}`;
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
      <circle cx="256" cy="256" r="232" fill={`url(#${id}-g)`} />
      <path d="M256 30 a226 226 0 0 1 226 226 c0 20 -4 40 -10 58 C400 200 300 170 60 300 C36 210 110 30 256 30z" fill={`url(#${id}-s)`} />
      <path d="M150 352 L256 140 L362 352 H312 L256 234 L200 352 Z" fill="#fff" />
      <path d="M118 360 L96 420 L170 372 Z" fill="#fff" />
      <circle cx="256" cy="110" r="16" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}
