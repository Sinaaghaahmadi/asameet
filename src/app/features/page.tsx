"use client";

import Link from "next/link";
import {
  Bot,
  Check,
  GraduationCap,
  MessageSquare,
  Mic,
  Phone,
  PieChart,
  Rocket,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, Spotlight, Tilt } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { SiteChrome } from "@/components/site/site-chrome";
import { useLocale, useT } from "@/lib/i18n";
import { toLocaleDigits } from "@/lib/utils";

const PILLARS = [
  { icon: MessageSquare, key: "messaging" },
  { icon: Phone, key: "calls" },
  { icon: Video, key: "meetings" },
  { icon: GraduationCap, key: "classes" },
  { icon: Bot, key: "ai" },
  { icon: ShieldCheck, key: "security" },
] as const;

/** Capability chips, grouped the way people actually shop for them. */
const GROUPS = [
  {
    icon: MessageSquare,
    titleKey: "landing.features.messaging.title",
    items: ["chat", "oneToOne", "screenShare", "storage10"],
  },
  {
    icon: Mic,
    titleKey: "landing.features.meetings.title",
    items: ["groupCall", "whiteboard", "p50", "pUnlimited"],
  },
  {
    icon: PieChart,
    titleKey: "landing.features.security.title",
    items: ["adminPanel", "api", "branding", "prioritySupport"],
  },
] as const;

const STEPS = ["step1", "step2", "step3"] as const;

export default function FeaturesPage() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.features")}
        title={t("landing.features.title")}
        subtitle={t("landing.features.subtitle")}
      />

      {/* Every pillar, at full length this time. */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.06}>
              <Spotlight as="article" className="glass-card h-full p-6">
                <span className="icon-3d-wrap mb-4 size-14">
                  <p.icon className="icon-3d size-7 text-primary" />
                </span>
                <h2 className="mb-2 text-lg font-bold">{t(`landing.features.${p.key}.title`)}</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {t(`landing.features.${p.key}.desc`)}
                </p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The checklist view, for people who came to compare. */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {GROUPS.map((g, i) => (
            <Reveal key={g.titleKey} delay={i * 0.08}>
              <Tilt className="h-full">
                <div className="glass-card h-full p-6 depth-2">
                  <h3 className="mb-4 flex items-center gap-3 text-base font-bold">
                    <span className="icon-3d-wrap size-10">
                      <g.icon className="icon-3d size-5 text-primary" />
                    </span>
                    {t(g.titleKey)}
                  </h3>
                  <ul className="space-y-2.5">
                    {g.items.map((it) => (
                      <li key={it} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <Check className="size-3 text-primary" />
                        </span>
                        {t(`landing.pricing.features.${it}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Three steps, on a rail. */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <Reveal>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.how.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.how.subtitle")}</p>
          </div>
        </Reveal>

        <div className="relative grid gap-6 md:grid-cols-3">
          <div
            className="absolute inset-x-8 top-9 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s} delay={i * 0.1}>
              <Spotlight className="glass-card relative h-full p-6 text-center">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-xl font-black text-white shadow-lg">
                  {toLocaleDigits(i + 1, locale)}
                </span>
                <h3 className="mb-2 font-bold">{t(`landing.how.${s}.title`)}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t(`landing.how.${s}.desc`)}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/?login=1">
                <Rocket className="size-5" />
                {t("landing.hero.ctaPrimary")}
              </Link>
            </Button>
            <Button size="lg" variant="glass" asChild>
              <Link href="/pricing">{t("landing.nav.pricing")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </SiteChrome>
  );
}
