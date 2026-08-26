"use client";

import Link from "next/link";
import { ArrowLeft, Palette } from "lucide-react";
import { useT } from "@/lib/i18n";

const SWATCHES = [
  { name: "asameet", css: "var(--asameet)" },
  { name: "asameet-light", css: "var(--asameet-light)" },
  { name: "asameet-dark", css: "var(--asameet-dark)" },
  { name: "background", css: "var(--background)" },
  { name: "card", css: "var(--card)" },
  { name: "muted", css: "var(--muted)" },
  { name: "border", css: "var(--border)" },
  { name: "destructive", css: "var(--destructive)" },
];

/**
 * A compact, honest slice of the design system in the footer: the palette,
 * the three glass levels and the radius scale — the same tokens the product
 * itself is built from, rendered live rather than as a screenshot.
 */
export function DesignSystemStrip() {
  const t = useT();

  return (
    <section className="mt-12 rounded-3xl border border-border/60 bg-background/40 p-6 backdrop-blur-sm" aria-labelledby="ds-strip">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 id="ds-strip" className="flex items-center gap-2 text-sm font-bold">
          <Palette className="size-4 text-primary icon-3d" />
          {t("landing.design.title")}
        </h3>
        <Link
          href="/design"
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-glow rounded-lg"
        >
          {t("landing.design.viewFull")}
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* Palette */}
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">{t("landing.design.colors")}</p>
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((s) => (
              <span
                key={s.name}
                title={s.name}
                className="size-7 rounded-lg border border-border/70 shadow-inner"
                style={{ background: s.css }}
              />
            ))}
          </div>
        </div>

        {/* Glass levels */}
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">{t("landing.design.surfaces")}</p>
          <div className="flex gap-1.5">
            <span className="glass-subtle flex h-7 flex-1 items-center justify-center rounded-lg text-[10px]">subtle</span>
            <span className="glass flex h-7 flex-1 items-center justify-center rounded-lg text-[10px]">base</span>
            <span className="glass-strong flex h-7 flex-1 items-center justify-center rounded-lg text-[10px]">strong</span>
          </div>
        </div>

        {/* Depth */}
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">{t("landing.design.depth")}</p>
          <div className="flex gap-1.5">
            <span className="depth-1 flex h-7 flex-1 items-center justify-center rounded-lg bg-card text-[10px]">1</span>
            <span className="depth-2 flex h-7 flex-1 items-center justify-center rounded-lg bg-card text-[10px]">2</span>
            <span className="depth-3 flex h-7 flex-1 items-center justify-center rounded-lg bg-card text-[10px]">3</span>
          </div>
        </div>
      </div>
    </section>
  );
}
