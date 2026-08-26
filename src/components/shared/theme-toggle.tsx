"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function ThemeToggle({ variant = "ghost" }: { variant?: "ghost" | "glass" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant={variant}
      size="iconSm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("common.lightMode") : t("common.darkMode")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
