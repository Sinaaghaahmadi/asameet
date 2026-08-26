"use client";

import { useEffect, useRef } from "react";

/**
 * The page's living backdrop.
 *
 * Three tinted blobs drift toward the pointer at different rates, and a
 * faint grid is revealed only around the cursor — so the background feels
 * like it is aware of you without ever competing with the content.
 *
 * Pointer position is published once per frame as CSS custom properties on
 * :root, which every other effect (spotlight cards, edge glow) reads. That
 * keeps a single listener for the whole page and zero React re-renders.
 */
export function InteractiveBackground() {
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    const publish = (x: number, y: number) => {
      root.style.setProperty("--px", x.toFixed(4));
      root.style.setProperty("--py", y.toFixed(4));
      root.style.setProperty("--pxp", `${(x * 100).toFixed(2)}%`);
      root.style.setProperty("--pyp", `${(y * 100).toFixed(2)}%`);
    };

    if (reduced) {
      publish(0.5, 0.5);
      return;
    }

    const onPointer = (e: PointerEvent) => {
      target.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };

    // On touch devices there is no hovering pointer; drift with scroll instead
    // so the backdrop still breathes as the page moves.
    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      target.current = { x: 0.5, y: Math.min(1, window.scrollY / max) };
    };

    const tick = () => {
      // Critically damped follow: fast enough to feel live, slow enough to calm.
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      publish(current.current.x, current.current.y);
      rafRef.current = requestAnimationFrame(tick);
    };

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div className="aurora" aria-hidden="true">
        <div
          className="aurora__blob"
          style={{
            width: "58vmax",
            height: "58vmax",
            insetInlineStart: "8%",
            top: "2%",
            background: "radial-gradient(circle, var(--asameet-light), transparent 62%)",
            transform: "translate3d(calc(var(--px) * 9vmax - 4.5vmax), calc(var(--py) * 9vmax - 4.5vmax), 0)",
          }}
        />
        <div
          className="aurora__blob"
          style={{
            width: "46vmax",
            height: "46vmax",
            insetInlineEnd: "4%",
            top: "26%",
            background: "radial-gradient(circle, #10b981, transparent 62%)",
            transform: "translate3d(calc(var(--px) * -14vmax + 7vmax), calc(var(--py) * 11vmax - 5.5vmax), 0)",
          }}
        />
        <div
          className="aurora__blob"
          style={{
            width: "52vmax",
            height: "52vmax",
            insetInlineStart: "26%",
            bottom: "-6%",
            background: "radial-gradient(circle, var(--asameet), transparent 65%)",
            transform: "translate3d(calc(var(--px) * 12vmax - 6vmax), calc(var(--py) * -9vmax + 4.5vmax), 0)",
          }}
        />
      </div>
      <div className="aurora__grid" aria-hidden="true" />
    </>
  );
}
