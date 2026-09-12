/** Design tokens ported from the web app's talk.css (oklch → hex). */
export const ACCENTS: Record<string, { name: string; main: string; strong: string; soft: string; bubbleOut: string }> = {
  sky:    { name: "Sky",    main: "#3b82f6", strong: "#2563eb", soft: "#93c5fd", bubbleOut: "#2f6fe4" },
  teal:   { name: "Teal",   main: "#14b8a6", strong: "#0d9488", soft: "#5eead4", bubbleOut: "#12a191" },
  violet: { name: "Violet", main: "#8b5cf6", strong: "#7c3aed", soft: "#c4b5fd", bubbleOut: "#7a4fe0" },
  rose:   { name: "Rose",   main: "#f43f5e", strong: "#e11d48", soft: "#fda4af", bubbleOut: "#e0395a" },
  orange: { name: "Orange", main: "#f97316", strong: "#ea580c", soft: "#fdba74", bubbleOut: "#e8681a" },
  green:  { name: "Green",  main: "#22c55e", strong: "#16a34a", soft: "#86efac", bubbleOut: "#1fb257" },
  indigo: { name: "Indigo", main: "#6366f1", strong: "#4f46e5", soft: "#a5b4fc", bubbleOut: "#5a5de6" },
};
export interface Theme {
  dark: boolean; accent: string; accentStrong: string; accentSoft: string;
  bg: string; surface: string; surface2: string; line: string; fg: string; muted: string;
  bubbleIn: string; bubbleInFg: string; bubbleOut: string; bubbleOutFg: string;
  danger: string; success: string; glass: string;
}
export function makeTheme(dark: boolean, accentKey: string): Theme {
  const a = ACCENTS[accentKey] ?? ACCENTS.sky;
  return dark
    ? { dark, accent: a.main, accentStrong: a.strong, accentSoft: a.soft, bg: "#0b1220", surface: "#131c2e", surface2: "#1b2640", line: "#26324d", fg: "#e8edf7", muted: "#8b98b5", bubbleIn: "#1e2a44", bubbleInFg: "#e8edf7", bubbleOut: a.bubbleOut, bubbleOutFg: "#ffffff", danger: "#ef4444", success: "#22c55e", glass: "rgba(255,255,255,0.06)" }
    : { dark, accent: a.main, accentStrong: a.strong, accentSoft: a.soft, bg: "#eef2f9", surface: "#ffffff", surface2: "#f3f6fc", line: "#dfe5f0", fg: "#0f172a", muted: "#64748b", bubbleIn: "#ffffff", bubbleInFg: "#0f172a", bubbleOut: a.bubbleOut, bubbleOutFg: "#ffffff", danger: "#dc2626", success: "#16a34a", glass: "rgba(15,23,42,0.05)" };
}
