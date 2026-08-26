"use client";

import { Bot, MessageSquare, Palette, ShieldCheck, Sparkles, Type, Video, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Reveal, Spotlight, Tilt } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { SiteChrome } from "@/components/site/site-chrome";
import { useT } from "@/lib/i18n";

/** Semantic tokens, shown as the live variables they are. */
const SEMANTIC = [
  "background",
  "foreground",
  "card",
  "primary",
  "secondary",
  "muted",
  "accent",
  "border",
  "destructive",
] as const;

const BRAND = ["asameet-light", "asameet", "asameet-dark"] as const;

const GLASS = [
  { cls: "glass-subtle", label: "subtle" },
  { cls: "glass", label: "base" },
  { cls: "glass-strong", label: "strong" },
] as const;

const DEPTH = [
  { cls: "depth-1", label: "depth-1" },
  { cls: "depth-2", label: "depth-2" },
  { cls: "depth-3", label: "depth-3" },
] as const;

const RADII = [
  { px: 8, cls: "rounded-lg" },
  { px: 12, cls: "rounded-xl" },
  { px: 16, cls: "rounded-2xl" },
  { px: 24, cls: "rounded-3xl" },
  { px: 999, cls: "rounded-full" },
] as const;

const TYPE_SCALE = [
  { cls: "text-5xl font-black", label: "Display / 48" },
  { cls: "text-3xl font-black", label: "Title / 30" },
  { cls: "text-xl font-bold", label: "Heading / 20" },
  { cls: "text-base leading-8", label: "Body / 16" },
  { cls: "text-sm text-muted-foreground", label: "Caption / 14" },
] as const;

const PRINCIPLES = ["p1", "p2", "p3", "p4"] as const;

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ElementType;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section className="glass-card p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-lg font-bold">
          <span className="icon-3d-wrap size-11">
            <Icon className="icon-3d size-5 text-primary" />
          </span>
          {title}
        </h2>
        {desc && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{desc}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </Reveal>
  );
}

export default function DesignPage() {
  const t = useT();

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.design")}
        title={t("landing.design.title")}
        subtitle={t("landing.design.subtitle")}
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-24">
        {/* ---- Colour ---- */}
        <Section icon={Palette} title={t("landing.design.colors")} desc={t("landing.design.colorsDesc")}>
          <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-3">
            {BRAND.map((b) => (
              <div key={b} className="overflow-hidden rounded-2xl border border-border/60 depth-1">
                <div className="h-20" style={{ background: `var(--${b})` }} />
                <p dir="ltr" className="px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
                  --{b}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {SEMANTIC.map((s) => (
              <div key={s} className="overflow-hidden rounded-xl border border-border/60">
                <div className="h-12" style={{ background: `var(--${s})` }} />
                <p dir="ltr" className="px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground">
                  {s}
                </p>
              </div>
            ))}
          </div>
          {/* Both themes are first class — switch here and watch every token above move. */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-4">
            <Sparkles className="size-4 text-primary" />
            <p className="flex-1 text-xs text-muted-foreground">{t("landing.design.p4")}</p>
            <ThemeToggle />
          </div>
        </Section>

        {/* ---- Typography ---- */}
        <Section icon={Type} title={t("landing.design.typography")} desc={t("landing.design.typographyDesc")}>
          <div className="space-y-4">
            {TYPE_SCALE.map((s) => (
              <div key={s.label} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/50 pb-3">
                <span className={s.cls}>{t("meta.tagline")}</span>
                <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Surfaces ---- */}
        <Section icon={Waves} title={t("landing.design.surfaces")} desc={t("landing.design.surfacesDesc")}>
          <div className="hero-gradient grid gap-4 rounded-3xl p-6 sm:grid-cols-3">
            {GLASS.map((g) => (
              <div key={g.cls} className={`${g.cls} rounded-2xl p-5 text-center`}>
                <p className="text-sm font-bold">{g.label}</p>
                <p dir="ltr" className="mt-1 font-mono text-[10px] opacity-70">.{g.cls}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Depth ---- */}
        <Section icon={ShieldCheck} title={t("landing.design.depth")} desc={t("landing.design.depthDesc")}>
          <div className="grid gap-5 sm:grid-cols-3">
            {DEPTH.map((d) => (
              <div key={d.cls} className={`rounded-2xl border border-border/60 bg-card p-6 text-center ${d.cls}`}>
                <p dir="ltr" className="font-mono text-xs text-muted-foreground">.{d.cls}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Tilt className="h-full">
              <div className="glass-card h-full p-6 text-center depth-3">
                <Logo size={64} className="icon-3d animate-float mx-auto" />
                <p dir="ltr" className="mt-4 font-mono text-[11px] text-muted-foreground">.tilt / .tilt-layer</p>
              </div>
            </Tilt>
            <Spotlight className="glass-card flex h-full flex-col items-center justify-center gap-3 p-6">
              <div className="flex gap-3">
                {[MessageSquare, Video, Bot].map((Icon, i) => (
                  <span key={i} className="icon-3d-wrap size-12">
                    <Icon className="icon-3d size-5 text-primary" />
                  </span>
                ))}
              </div>
              <p dir="ltr" className="font-mono text-[11px] text-muted-foreground">.icon-3d-wrap / .spotlight</p>
            </Spotlight>
          </div>
        </Section>

        {/* ---- Radius ---- */}
        <Section icon={Palette} title={t("landing.design.radius")}>
          <div className="flex flex-wrap items-end gap-4">
            {RADII.map((r) => (
              <div key={r.px} className="text-center">
                <div className={`size-16 border border-primary/40 bg-primary/15 ${r.cls}`} />
                <p dir="ltr" className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {r.px === 999 ? "full" : `${r.px}px`}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Components ---- */}
        <Section icon={Sparkles} title={t("landing.design.motion")} desc={t("landing.design.motionDesc")}>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("landing.hero.ctaPrimary")}</Button>
            <Button variant="glass">{t("landing.hero.ctaSecondary")}</Button>
            <Button variant="outline">{t("common.cancel")}</Button>
            <Button variant="ghost">{t("common.back")}</Button>
            <Button variant="destructive">{t("common.delete")}</Button>
            <Badge>{t("landing.hero.liveBadge")}</Badge>
            <Badge variant="secondary">{t("common.online")}</Badge>
          </div>
        </Section>

        {/* ---- Principles ---- */}
        <Section icon={ShieldCheck} title={t("landing.design.principles")}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm leading-7">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-black text-white">
                  {i + 1}
                </span>
                {t(`landing.design.${p}`)}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </SiteChrome>
  );
}
