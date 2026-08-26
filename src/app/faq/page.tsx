"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { SiteChrome } from "@/components/site/site-chrome";
import { useT } from "@/lib/i18n";

const QUESTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export default function FaqPage() {
  const t = useT();

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.faq")}
        title={t("landing.faq.title")}
        subtitle={t("landing.faq.subtitle")}
      />

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <Reveal>
          <Accordion type="single" collapsible className="space-y-3">
            {QUESTIONS.map((n) => (
              <AccordionItem key={n} value={n}>
                <AccordionTrigger>{t(`landing.faq.q${n}`)}</AccordionTrigger>
                <AccordionContent>{t(`landing.faq.a${n}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-card mt-10 flex flex-col items-center gap-4 p-8 text-center depth-2">
            <span className="icon-3d-wrap size-12">
              <Mail className="icon-3d size-6 text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">{t("landing.faq.subtitle")}</p>
            <Button asChild>
              <Link href="/contact">{t("landing.nav.contact")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </SiteChrome>
  );
}
