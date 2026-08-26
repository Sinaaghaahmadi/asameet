"use client";

import { useState } from "react";
import { Check, Copy, LifeBuoy, Mail, ShieldCheck, Store } from "lucide-react";
import { Reveal, Spotlight } from "@/components/site/interactive";
import { PageHeader } from "@/components/site/page-header";
import { SiteChrome } from "@/components/site/site-chrome";
import { useT } from "@/lib/i18n";

/* Organisational email is the only channel — no forms, no phone queue. */
const CHANNELS = [
  { icon: Mail, key: "general", email: "hello@asameet.online" },
  { icon: LifeBuoy, key: "support", email: "support@asameet.online" },
  { icon: Store, key: "sales", email: "sales@asameet.online" },
  { icon: ShieldCheck, key: "security", email: "security@asameet.online" },
] as const;

export default function ContactPage() {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      setTimeout(() => setCopied((c) => (c === email ? null : c)), 1800);
    } catch {
      /* Clipboard denied — the mailto link below still works. */
    }
  };

  return (
    <SiteChrome>
      <PageHeader
        eyebrow={t("landing.nav.contact")}
        title={t("landing.contact.title")}
        subtitle={t("landing.contact.subtitle")}
      />

      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.07}>
              <Spotlight className="glass-card h-full p-6">
                <span className="icon-3d-wrap mb-4 size-12">
                  <c.icon className="icon-3d size-6 text-primary" />
                </span>
                <h2 className="font-bold">{t(`landing.contact.${c.key}`)}</h2>
                <a
                  href={`mailto:${c.email}`}
                  dir="ltr"
                  className="mt-2 block text-sm font-medium text-primary hover:underline focus-glow rounded-lg"
                >
                  {c.email}
                </a>
                <button
                  onClick={() => copy(c.email)}
                  className="btn-glass mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium focus-glow"
                >
                  {copied === c.email ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      {t("common.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      {t("landing.contact.copyEmail")}
                    </>
                  )}
                </button>
              </Spotlight>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-center text-sm text-muted-foreground">{t("landing.contact.note")}</p>
        </Reveal>
      </section>

      <div className="pb-20" />
    </SiteChrome>
  );
}
