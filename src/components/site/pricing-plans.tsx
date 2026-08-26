"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal, Spotlight } from "@/components/site/interactive";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";

type Billing = "monthly" | "yearly";

const PLANS = [
  {
    key: "free",
    popular: false,
    features: ["chat", "oneToOne", "storage1", "p10"],
  },
  {
    key: "pro",
    popular: true,
    features: [
      "chat",
      "oneToOne",
      "groupCall",
      "screenShare",
      "storage10",
      "whiteboard",
      "adminPanel",
      "aiAssistant",
      "prioritySupport",
      "p50",
    ],
  },
  {
    key: "enterprise",
    popular: false,
    features: [
      "chat",
      "oneToOne",
      "groupCall",
      "screenShare",
      "storageUnlimited",
      "whiteboard",
      "adminPanel",
      "aiAssistant",
      "prioritySupport",
      "branding",
      "api",
      "pUnlimited",
    ],
  },
] as const;

export function PricingPlans() {
  const t = useT();
  const { locale } = useLocale();
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      {/* Billing period switch */}
      <Reveal>
        <div className="mb-3 flex justify-center">
          <div
            role="radiogroup"
            aria-label={t("landing.pricing.title")}
            className="btn-glass inline-flex items-center gap-1 rounded-full p-1"
          >
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                role="radio"
                aria-checked={billing === b}
                onClick={() => setBilling(b)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all focus-glow",
                  billing === b
                    ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`landing.pricing.${b}`)}
                {b === "yearly" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      billing === "yearly" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
                    )}
                  >
                    {t("landing.pricing.saveBadge")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="mb-10 text-center text-xs text-muted-foreground">
          {billing === "yearly" ? t("landing.pricing.yearlyNote") : " "}
        </p>
      </Reveal>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan, i) => {
          const priceKey = billing === "yearly" ? "priceYearly" : "price";
          const price = t(`landing.pricing.${plan.key}.${priceKey}`);
          const unit = plan.key === "pro" ? t("landing.pricing.pro.unit") : "";
          const numeric = /[0-9۰-۹٠-٩]/.test(price);

          return (
            <Reveal key={plan.key} delay={i * 0.08}>
              <Spotlight
                as="article"
                className={cn(
                  "glass-card flex h-full flex-col p-7",
                  plan.popular && "border-2 !border-primary depth-3 lg:-translate-y-4"
                )}
              >
                {plan.popular && (
                  <Badge className="mb-4 w-fit gap-1 bg-gradient-to-l from-teal-500 to-emerald-600 text-white">
                    <Sparkles className="size-3" />
                    {t("landing.pricing.popular")}
                  </Badge>
                )}

                <h3 className="text-lg font-bold">{t(`landing.pricing.${plan.key}.name`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`landing.pricing.${plan.key}.desc`)}</p>

                <p className="mt-5 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-4xl font-black tabular-nums">{toLocaleDigits(price, locale)}</span>
                  {numeric && unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                  {numeric && (
                    <span className="text-xs text-muted-foreground">
                      {billing === "yearly" ? t("landing.pricing.perYear") : t("landing.pricing.perMonth")}
                    </span>
                  )}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="size-3 text-primary" />
                      </span>
                      {t(`landing.pricing.features.${f}`)}
                    </li>
                  ))}
                </ul>

                <Button className="mt-7 w-full" variant={plan.popular ? "default" : "glass"} asChild>
                  <Link href={plan.key === "enterprise" ? "/contact" : "/?login=1"}>
                    {plan.key === "enterprise" ? t("landing.pricing.ctaContact") : t("landing.pricing.cta")}
                  </Link>
                </Button>
              </Spotlight>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
