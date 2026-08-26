"use client";

import Link from "next/link";
import { Globe2, Heart, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { CountUp, Reveal, Spotlight, Tilt } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { SiteChrome } from "@/components/site/site-chrome";
import { useLocale, useT } from "@/lib/i18n";
import { toLocaleDigits } from "@/lib/utils";

const TEAM_STATS = [
  { key: "members", value: 17, icon: Users },
  { key: "countries", value: 9, icon: Globe2 },
  { key: "timezones", value: 7, icon: Rocket },
] as const;

const VALUES = ["v1", "v2", "v3"] as const;

export default function AboutPage() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.about")}
        title={t("landing.about.title")}
        subtitle={t("landing.about.subtitle")}
      />

      {/* The story, beside the mark it produced. */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            {(["text1", "text2", "text3"] as const).map((k, i) => (
              <Reveal key={k} delay={i * 0.07}>
                <p className="text-base leading-9 text-muted-foreground">{t(`landing.about.${k}`)}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12} y={40}>
            <Tilt className="mx-auto w-full max-w-sm">
              <div className="glass-strong img-glow rounded-[2rem] p-10 text-center depth-3">
                <Logo size={96} className="icon-3d animate-float mx-auto" />
                <p className="mt-6 text-lg font-black">{t("meta.name")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("meta.tagline")}</p>
                <p
                  className="tilt-layer mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
                  style={{ ["--tilt-z" as string]: "50px" }}
                >
                  {t("landing.footer.madeWith")}
                  <Heart className="size-3.5 fill-red-500 text-red-500" aria-label="❤" />
                  {t("landing.footer.byIranians")}
                </p>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* Team, counted. */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TEAM_STATS.map((s, i) => (
            <Reveal key={s.key} delay={i * 0.07}>
              <Spotlight className="glass-card h-full p-6 text-center">
                <span className="icon-3d-wrap mx-auto mb-3 size-11">
                  <s.icon className="icon-3d size-5 text-primary" />
                </span>
                <p className="text-3xl font-black">
                  <CountUp target={s.value} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`landing.about.stats.${s.key}`)}</p>
              </Spotlight>
            </Reveal>
          ))}
          <Reveal delay={0.21}>
            <Spotlight className="glass-card h-full p-6 text-center">
              <span className="icon-3d-wrap mx-auto mb-3 size-11">
                <Globe2 className="icon-3d size-5 text-primary" />
              </span>
              <p className="text-3xl font-black">
                {toLocaleDigits(100, locale)}
                {locale === "fa" || locale === "ar" ? "٪" : "%"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("landing.about.stats.remote")}</p>
            </Spotlight>
          </Reveal>
        </div>
      </section>

      {/* Values. */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <Reveal>
          <h2 className="mb-8 text-center text-3xl font-black sm:text-4xl">{t("landing.about.values.title")}</h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v} delay={i * 0.08}>
              <Spotlight className="glass-card h-full p-6">
                <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-black text-white shadow-lg">
                  {i + 1}
                </span>
                <h3 className="mb-2 font-bold">{t(`landing.about.values.${v}.title`)}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t(`landing.about.values.${v}.desc`)}</p>
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
              <Link href="/contact">{t("landing.nav.contact")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </SiteChrome>
  );
}
