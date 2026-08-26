"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  GraduationCap,
  MessageSquare,
  MousePointer2,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { CountUp, KineticWords, Reveal, Spotlight, Tilt } from "@/components/site/interactive";
import { Testimonials } from "@/components/site/testimonials";
import { SiteChrome } from "@/components/site/site-chrome";
import { useLocale, useT } from "@/lib/i18n";
import { toLocaleDigits } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

/* Deliberately not round: these read as measurements, not marketing. */
const STATS = [
  { value: 127438, suffix: "", key: "users" },
  { value: 46912, suffix: "", key: "calls" },
  { value: 88317, suffix: "", key: "meetings" },
  { value: 31, suffix: "", key: "countries" },
] as const;

const PILLARS = [
  { icon: MessageSquare, key: "messaging", span: "sm:col-span-3 lg:col-span-3" },
  { icon: Bot, key: "ai", span: "sm:col-span-3 lg:col-span-3" },
  { icon: Video, key: "meetings", span: "sm:col-span-2 lg:col-span-2" },
  { icon: Phone, key: "calls", span: "sm:col-span-2 lg:col-span-2" },
  { icon: GraduationCap, key: "classes", span: "sm:col-span-2 lg:col-span-2" },
] as const;

export function LandingPage() {
  const t = useT();
  const { locale } = useLocale();
  const { setShowLoginModal } = useAppStore();

  const rotating = t("landing.hero.rotating").split(/[،,]/).map((s) => s.trim()).filter(Boolean);

  return (
    <SiteChrome>
      {/* ============================================================
          HERO — an asymmetric, layered opening rather than the usual
          centred headline over a stock illustration.
          ============================================================ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 text-center lg:text-start">
            <Reveal>
              <Badge className="mb-6 gap-1.5 px-3 py-1 text-sm">
                <Sparkles className="size-3.5" />
                {t("landing.hero.badge")}
              </Badge>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="text-balance text-[2.6rem] font-black leading-[1.12] sm:text-6xl xl:text-7xl">
                <span className="block">{t("landing.hero.title1")}</span>
                <span className="hero-text-gradient block">{t("landing.hero.title2")}</span>
              </h1>
            </Reveal>

            {/* The verb changes; the sentence stays. */}
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg font-bold text-primary sm:text-xl">
                <KineticWords words={rotating} />
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg lg:mx-0">
                {t("landing.hero.subtitle")}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button size="lg" onClick={() => setShowLoginModal(true)}>
                  <Rocket className="size-5" />
                  {t("landing.hero.ctaPrimary")}
                </Button>
                <Button variant="glass" size="lg" asChild>
                  <Link href="/features">
                    {t("landing.features.exploreAll")}
                    <ArrowLeft className="size-4 ltr:rotate-180" />
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <p className="mt-6 text-xs text-muted-foreground">{t("landing.hero.trust")}</p>
            </Reveal>
          </div>

          {/* Product surface that leans toward the pointer. */}
          <Reveal delay={0.15} y={40}>
            <Tilt className="relative mx-auto w-full max-w-md">
              <div className="glass-strong img-glow rounded-[2rem] p-4 depth-3">
                <div className="mb-3 flex items-center gap-3 border-b border-border/50 pb-3">
                  <Logo size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t("meta.name")}</p>
                    <p className="flex items-center gap-1 text-xs text-emerald-500">
                      <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      {t("common.online")}
                    </p>
                  </div>
                  <Video className="size-5 text-primary" />
                  <Phone className="size-4 text-primary" />
                </div>

                <div className="space-y-2.5">
                  <div className="msg-bubble-other max-w-[85%]">
                    <p className="text-sm">جلسه ساعت ۱۰ آماده‌ست؟ 👋</p>
                  </div>
                  <div className="flex justify-end">
                    <div className="msg-bubble-own max-w-[85%]">
                      <p className="text-sm">آره، لینکش همین‌جاست ✨</p>
                    </div>
                  </div>

                  <div className="tilt-layer glass-card flex items-center gap-3 rounded-2xl p-3" style={{ ["--tilt-z" as string]: "55px" }}>
                    <span className="icon-3d-wrap size-9">
                      <Video className="size-4 text-primary" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{t("meetings.title")}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="inline-block size-1.5 animate-pulse rounded-full bg-red-500" />
                        {t("meetings.recording")}
                      </p>
                    </div>
                    <Button size="sm">{t("meetings.join")}</Button>
                  </div>

                  <div className="flex justify-end">
                    <div className="msg-bubble-own max-w-[85%]">
                      <p className="text-sm">🤖 {t("ai.minutes")} — {t("ai.poweredBy")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ps-2 pt-1 text-xs text-muted-foreground">
                    <span className="typing-dot inline-block size-1.5 rounded-full bg-primary" />
                    <span className="typing-dot inline-block size-1.5 rounded-full bg-primary" />
                    <span className="typing-dot inline-block size-1.5 rounded-full bg-primary" />
                    <span>{t("messenger.typing")}</span>
                  </div>
                </div>
              </div>

              {/* Floating chips that ride above the card in 3D. */}
              <div
                className="tilt-layer glass absolute -end-4 -top-5 hidden rounded-2xl p-3 depth-2 sm:block"
                style={{ ["--tilt-z" as string]: "90px" }}
              >
                <Bot className="size-6 text-primary icon-3d" />
              </div>
              <div
                className="tilt-layer glass absolute -bottom-5 -start-4 hidden rounded-2xl p-3 depth-2 sm:block"
                style={{ ["--tilt-z" as string]: "75px" }}
              >
                <ShieldCheck className="size-6 text-emerald-500 icon-3d" />
              </div>
            </Tilt>
          </Reveal>
        </div>

        {/* Scroll affordance, doubling as a hint that the page reacts. */}
        <div className="mt-14 flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <MousePointer2 className="size-3.5 text-primary" />
          <span className="scroll-hint">{t("landing.hero.scroll")}</span>
        </div>
      </section>

      {/* ============================================================
          PILLARS — a bento grid; each tile lights under the cursor.
          ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.features.subtitle")}</p>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-6">
          {PILLARS.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.06} className={p.span}>
              <Spotlight as="article" className="glass-card group h-full p-6">
                <span className="icon-3d-wrap mb-4 size-14">
                  <p.icon className="icon-3d size-7 text-primary" />
                </span>
                <h3 className="mb-2 text-lg font-bold">{t(`landing.features.${p.key}.title`)}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t(`landing.features.${p.key}.desc`)}</p>
              </Spotlight>
            </Reveal>
          ))}

          {/* The sixth tile is the way onward, not another feature. */}
          <Reveal delay={0.3} className="sm:col-span-6 lg:col-span-6">
            <Spotlight className="glass-card flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="icon-3d-wrap size-12">
                  <ShieldCheck className="icon-3d size-6 text-primary" />
                </span>
                <div>
                  <h3 className="font-bold">{t("landing.features.security.title")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("landing.features.security.desc")}</p>
                </div>
              </div>
              <Button variant="glass" asChild>
                <Link href="/features">
                  {t("landing.features.exploreAll")}
                  <ArrowLeft className="size-4 ltr:rotate-180" />
                </Link>
              </Button>
            </Spotlight>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          STATS — measured, not rounded.
          ============================================================ */}
      <section className="relative overflow-hidden py-16">
        <div className="hero-gradient absolute inset-0 opacity-95" />
        <div className="dot-pattern absolute inset-0 opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4">
          <Reveal>
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-white sm:text-3xl">{t("landing.stats.title")}</h2>
              <p className="mt-2 text-sm text-teal-50/90">{t("landing.stats.subtitle")}</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.key} delay={i * 0.07}>
                <div className="glass rounded-3xl p-6 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <p className="text-3xl font-black text-white sm:text-4xl">
                    <CountUp target={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-teal-50">{t(`landing.stats.${s.key}`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          VOICES
          ============================================================ */}
      <section className="py-16">
        <Reveal>
          <div className="mx-auto mb-4 max-w-2xl px-4 text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.testimonials.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.testimonials.subtitle")}</p>
          </div>
        </Reveal>
        <Testimonials />
      </section>

      {/* ============================================================
          CLOSING
          ============================================================ */}
      <section className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <Reveal y={36}>
          <Spotlight className="hero-gradient relative overflow-hidden rounded-[2.5rem] p-10 text-center depth-3 sm:p-14">
            <div className="dot-pattern absolute inset-0 opacity-20" />
            <div className="relative">
              <Logo size={72} className="icon-3d animate-float mx-auto mb-6" />
              <h2 className="text-balance text-3xl font-black text-white sm:text-4xl">{t("landing.cta.title")}</h2>
              <p className="mt-3 text-teal-50">{t("landing.cta.subtitle")}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" className="!bg-white !text-teal-700 hover:!bg-teal-50" onClick={() => setShowLoginModal(true)}>
                  <Rocket className="size-5" />
                  {t("landing.cta.button")}
                </Button>
                <Button size="lg" variant="glass" className="!text-white" asChild>
                  <Link href="/pricing">{t("landing.nav.pricing")}</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-teal-50/80">
                {toLocaleDigits(STATS[0].value.toLocaleString("en-US"), locale)} {t("landing.stats.users")}
              </p>
            </div>
          </Spotlight>
        </Reveal>
      </section>
    </SiteChrome>
  );
}
