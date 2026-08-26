"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Spotlight } from "@/components/site/interactive";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

/**
 * Testimonials on a rail that walks forward to the end, then walks back —
 * so every card gets its turn in both directions instead of snapping around.
 * Pointer or keyboard interaction pauses it; manual controls always work.
 */
export function Testimonials() {
  const t = useT();
  const { dir } = useLocale();
  const [index, setIndex] = useState(0);
  const [forward, setForward] = useState(true);
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const LAST = KEYS.length - 1;

  /** Bounce off both ends instead of stalling on them for a beat. */
  const step = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next > LAST) {
          setForward(false);
          return LAST - 1;
        }
        if (next < 0) {
          setForward(true);
          return 1;
        }
        if (next === LAST) setForward(false);
        if (next === 0) setForward(true);
        return next;
      });
    },
    [LAST]
  );

  /** Jumping straight to a card also decides which way it travels next. */
  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      setForward(i < LAST);
    },
    [LAST]
  );

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => step(forward ? 1 : -1), 4200);
    return () => clearTimeout(id);
  }, [index, forward, paused, step]);

  // Keep the active card centred in the scroll rail.
  useEffect(() => {
    const rail = railRef.current;
    const card = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !card) return;
    rail.scrollTo({
      left: card.offsetLeft - rail.offsetWidth / 2 + card.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [index]);

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={railRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc(50%-19rem))] py-4"
        role="list"
      >
        {KEYS.map((k, i) => {
          const active = i === index;
          return (
            <Spotlight
              as="li"
              key={k}
              role="listitem"
              className={cn(
                "glass-card w-[19rem] shrink-0 snap-center list-none p-6 transition-all duration-500 sm:w-[22rem]",
                active ? "scale-100 opacity-100 depth-2" : "scale-[0.94] opacity-55"
              )}
            >
              <Quote className="mb-3 size-6 text-primary/40" aria-hidden="true" />
              <blockquote className="min-h-[7.5rem] text-sm leading-7 text-muted-foreground">
                {t(`landing.testimonials.${k}.text`)}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-sm font-bold text-white">
                  {t(`landing.testimonials.${k}.name`).slice(0, 1)}
                </span>
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    {t(`landing.testimonials.${k}.name`)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`landing.testimonials.${k}.role`)}
                  </span>
                </span>
              </figcaption>
            </Spotlight>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label={t("landing.testimonials.prev")}
          className="btn-glass flex size-9 cursor-pointer items-center justify-center rounded-full disabled:opacity-40 focus-glow"
        >
          {dir === "rtl" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label={t("landing.testimonials.title")}>
          {KEYS.map((k, i) => (
            <button
              key={k}
              role="tab"
              aria-selected={i === index}
              aria-label={t(`landing.testimonials.${k}.name`)}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-all",
                i === index ? "w-7 bg-primary" : "w-1.5 bg-border hover:bg-primary/50"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => step(1)}
          disabled={index === LAST}
          aria-label={t("landing.testimonials.next")}
          className="btn-glass flex size-9 cursor-pointer items-center justify-center rounded-full disabled:opacity-40 focus-glow"
        >
          {dir === "rtl" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}
