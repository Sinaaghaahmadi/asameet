"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { toLocaleDigits } from "@/lib/utils";

/* ---------------------------------------------------------------
   Pointer-tracked surface: writes --mx/--my so .spotlight and
   .edge-glow can light up the exact spot under the cursor.
   --------------------------------------------------------------- */

export function Spotlight({
  as: Tag = "div",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);

  const onMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  return React.createElement(
    Tag,
    {
      ref: ref as React.Ref<never>,
      onPointerMove: onMove,
      className: cn("spotlight edge-glow", className),
      ...rest,
    },
    children
  );
}

/* ---------------------------------------------------------------
   Tilt: the card leans toward the pointer, its inner layer floating
   slightly above the surface. Disabled for coarse pointers and for
   viewers who asked for less motion.
   --------------------------------------------------------------- */

export function Tilt({
  className,
  children,
  max = 7,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(pointer: fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--tilt-y", `${px * max * 2}deg`);
    ref.current.style.setProperty("--tilt-x", `${-py * max * 2}deg`);
  };

  const reset = () => {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div className="tilt-scene" onPointerMove={onMove} onPointerLeave={reset}>
      <div ref={ref} className={cn("tilt", className)} {...rest}>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Reveal on scroll — a single shared pattern so every section
   enters the page the same way.
   --------------------------------------------------------------- */

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------
   Kinetic headline: swaps through a list of verbs in place.
   --------------------------------------------------------------- */

export function KineticWords({ words, interval = 2200 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const out = setTimeout(() => setPhase("out"), interval);
    const swap = setTimeout(() => {
      setIndex((i) => (i + 1) % words.length);
      setPhase("in");
    }, interval + 520);
    return () => {
      clearTimeout(out);
      clearTimeout(swap);
    };
  }, [index, words.length, interval]);

  return (
    <span className="kinetic-line">
      <span key={index} className={phase === "in" ? "kinetic-enter" : "kinetic-exit"}>
        {words[index]}
      </span>
      {/* Reserves the width of the longest word so the line never jumps. */}
      <span className="invisible" aria-hidden="true">
        {words.reduce((a, b) => (a.length >= b.length ? a : b), "")}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------
   Count-up that respects locale digits.
   --------------------------------------------------------------- */

export function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);
  const { locale } = useLocale();

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const duration = 1700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {toLocaleDigits(value.toLocaleString("en-US"), locale)}
      {suffix}
    </span>
  );
}
