"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, MonitorSmartphone, MessageSquare, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { LogoWordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { InteractiveBackground } from "@/components/site/interactive-bg";
import { DesignSystemStrip } from "@/components/site/design-system-strip";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";

const RELEASES = "https://github.com/sinaaghaahmadi/q/releases";

/** Marketing pages all sit inside this shell: living backdrop, nav, footer. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { locale } = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pages = [
    { href: "/features", label: t("landing.nav.features") },
    { href: "/pricing", label: t("landing.nav.pricing") },
    { href: "/about", label: t("landing.nav.about") },
    { href: "/faq", label: t("landing.nav.faq") },
    { href: "/contact", label: t("landing.nav.contact") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <InteractiveBackground />

      {/* ---------------- Nav ---------------- */}
      <header
        className={cn(
          "safe-area-top sticky top-0 z-40 transition-all duration-300",
          scrolled ? "glass-nav" : "border-b border-transparent"
        )}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4" aria-label={t("meta.name")}>
          <Link href="/" className="focus-glow rounded-xl">
            <LogoWordmark />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {pages.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-glow",
                  pathname === p.href
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <LanguageSwitcher />
            <Button size="sm" asChild>
              <Link href="/?login=1">{t("landing.nav.start")}</Link>
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              className="md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={t("landing.nav.menu")}
              aria-controls="site-menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </nav>

        {menuOpen && (
          <div id="site-menu" className="glass-strong border-t border-border/40 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {pages.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-accent"
                >
                  {p.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex justify-center sm:hidden">
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* ---------------- Footer ---------------- */}
      <footer className="mt-auto border-t border-border/60 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <LogoWordmark />
              <p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">{t("meta.description")}</p>
            </div>

            <nav className="md:col-span-2" aria-label={t("landing.footer.product")}>
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.product")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary">{t("landing.nav.features")}</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">{t("landing.nav.pricing")}</Link></li>
                <li><Link href="/faq" className="hover:text-primary">{t("landing.nav.faq")}</Link></li>
                <li><Link href="/design" className="hover:text-primary">{t("landing.nav.design")}</Link></li>
              </ul>
            </nav>

            <nav className="md:col-span-2" aria-label={t("landing.footer.company")}>
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.company")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">{t("landing.nav.about")}</Link></li>
                <li><Link href="/contact" className="hover:text-primary">{t("landing.nav.contact")}</Link></li>
                <li><Link href="/faq" className="hover:text-primary">{t("landing.nav.faq")}</Link></li>
              </ul>
            </nav>

            <div className="md:col-span-4">
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.downloadApp")}</h3>
              <div className="space-y-2">
                <a href={RELEASES} className="glass-card flex items-center gap-3 p-3 text-sm font-medium focus-glow">
                  <Smartphone className="size-5 text-primary icon-3d" />
                  {t("landing.footer.androidApp")}
                </a>
                <a href={RELEASES} className="glass-card flex items-center gap-3 p-3 text-sm font-medium focus-glow">
                  <MessageSquare className="size-5 text-primary icon-3d" />
                  {t("landing.footer.messengerApp")}
                </a>
                <Link href="/?login=1" className="glass-card flex items-center gap-3 p-3 text-sm font-medium focus-glow">
                  <MonitorSmartphone className="size-5 text-primary icon-3d" />
                  {t("landing.footer.pwa")}
                </Link>
              </div>
            </div>
          </div>

          {/* The design system, visible where anyone can inspect it. */}
          <DesignSystemStrip />

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-start">
            <p>
              © {toLocaleDigits(new Date().getFullYear(), locale)} {t("meta.name")} — {t("landing.footer.rights")}
            </p>
            <p className="flex items-center gap-1.5">
              {t("landing.footer.madeWith")}
              <Heart className="size-4 fill-red-500 text-red-500" aria-label="❤" />
              {t("landing.footer.byIranians")} ·{" "}
              <span className="font-bold text-foreground">{t("landing.footer.groupName")}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
