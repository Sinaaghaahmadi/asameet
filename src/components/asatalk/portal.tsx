"use client";

/**
 * Renders overlays straight into <body>.
 *
 * The two shell columns are isolated stacking contexts, which keeps their own
 * content (bubbles, headers, FABs) from leaking over a neighbour — but it also
 * traps any `position: fixed` child inside the column, so a sheet opened from
 * the chat list would paint under the conversation. Portalling past both
 * columns is the only placement that cannot be trapped.
 *
 * The host carries `.talk` plus the live accent variables, because those live
 * on the shell element and would not reach a node outside it.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACCENTS, useTalkStore } from "@/stores/talk-store";

export function TalkPortal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const settings = useTalkStore((s) => s.settings);
  const accent = ACCENTS[settings.accent] ?? ACCENTS.sky;

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "talk";
    el.dataset.talkPortal = "";
    document.body.appendChild(el);
    setHost(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    if (!host) return;
    host.style.setProperty("--talk-h", String(accent.h));
    host.style.setProperty("--talk-c", String(accent.c));
    host.style.setProperty("--talk-radius", `${settings.bubbleRadius}px`);
    host.style.setProperty("--talk-font-size", `${settings.fontSize}px`);
  }, [host, accent, settings.bubbleRadius, settings.fontSize]);

  return host ? createPortal(children, host) : null;
}
