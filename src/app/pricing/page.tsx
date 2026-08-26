"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { PricingPlans } from "@/components/site/pricing-plans";
import { SiteChrome } from "@/components/site/site-chrome";
import { useT } from "@/lib/i18n";

/* Money questions belong next to the prices, not five clicks away. */
const MONEY_FAQ = ["q1", "q8", "q7"] as const;

export default function PricingPage() {
  const t = useT();

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.pricing")}
        title={t("landing.pricing.title")}
        subtitle={t("landing.pricing.subtitle")}
      />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <PricingPlans />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <Reveal>
          <h2 className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
            <HelpCircle className="size-5 text-primary icon-3d" />
            {t("landing.faq.title")}
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <Accordion type="single" collapsible className="space-y-3">
            {MONEY_FAQ.map((q) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger>{t(`landing.faq.${q}`)}</AccordionTrigger>
                <AccordionContent>{t(`landing.faq.a${q.slice(1)}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-8 text-center">
            <Button variant="glass" asChild>
              <Link href="/faq">{t("landing.nav.faq")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </SiteChrome>
  );
}
