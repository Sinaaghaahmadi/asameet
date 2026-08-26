"use client";

import { Reveal } from "@/components/site/interactive";

/**
 * The opening of every inner marketing page. Deliberately quieter than the
 * home hero — the eyebrow carries the section, the title carries the page.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="relative overflow-hidden px-4 pb-10 pt-14 text-center sm:pt-20">
      <div className="mx-auto max-w-3xl">
        {eyebrow && (
          <Reveal>
            <p className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-bold tracking-wide text-primary">
              {eyebrow}
            </p>
          </Reveal>
        )}
        <Reveal delay={0.05}>
          <h1 className="text-balance text-4xl font-black leading-[1.15] sm:text-5xl">
            <span className="hero-text-gradient">{title}</span>
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          </Reveal>
        )}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </Reveal>
      </div>
    </header>
  );
}
