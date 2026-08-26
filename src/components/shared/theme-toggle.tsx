"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, labelKey: "common.themeLight" },
  { value: "dark", icon: Moon, labelKey: "common.themeDark" },
  { value: "system", icon: Monitor, labelKey: "common.themeSystem" },
] as const;

/**
 * Theme control with light, dark and follow-system as equal choices — light
 * mode is picked directly rather than reached by toggling twice.
 *
 * `compact` renders a single cycling button for the app sidebar, where a
 * three-up segmented control would not fit.
 */
export function ThemeToggle({
  variant = "ghost",
  compact = false,
}: {
  variant?: "ghost" | "glass";
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = mounted ? (theme ?? "system") : "system";
  const activeIndex = Math.max(0, OPTIONS.findIndex((o) => o.value === active));
  const Current = OPTIONS[activeIndex].icon;

  if (compact) {
    const next = OPTIONS[(activeIndex + 1) % OPTIONS.length];
    return (
      <Button
        variant={variant}
        size="iconSm"
        onClick={() => setTheme(next.value)}
        aria-label={`${t("common.theme")}: ${t(OPTIONS[activeIndex].labelKey)}`}
        title={`${t("common.theme")}: ${t(OPTIONS[activeIndex].labelKey)}`}
      >
        <Current className="size-4" />
      </Button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("common.theme")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-0.5",
        variant === "glass" ? "btn-glass" : "bg-secondary/70"
      )}
    >
      {OPTIONS.map((opt) => {
        const selected = active === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            aria-label={t(opt.labelKey)}
            title={t(opt.labelKey)}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full transition-all focus-glow",
              selected
                ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <opt.icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
