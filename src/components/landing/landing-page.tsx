"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Bot,
  Check,
  Download,
  GraduationCap,
  Globe2,
  Heart,
  Mail,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Phone,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo, LogoWordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLocale, useT } from "@/lib/i18n";
import { toLocaleDigits } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);
  const { locale } = useLocale();

  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {toLocaleDigits(value.toLocaleString("en-US"), locale)}
      {suffix}
    </span>
  );
}

export function LandingPage() {
  const t = useT();
  const { locale } = useLocale();
  const { setShowLoginModal } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: t("landing.nav.features") },
    { href: "#pricing", label: t("landing.nav.pricing") },
    { href: "#faq", label: t("landing.nav.faq") },
    { href: "#about", label: t("landing.nav.about") },
    { href: "#contact", label: t("landing.nav.contact") },
  ];

  const features = [
    { icon: MessageSquare, titleKey: "landing.features.messaging.title", descKey: "landing.features.messaging.desc" },
    { icon: Phone, titleKey: "landing.features.calls.title", descKey: "landing.features.calls.desc" },
    { icon: Video, titleKey: "landing.features.meetings.title", descKey: "landing.features.meetings.desc" },
    { icon: GraduationCap, titleKey: "landing.features.classes.title", descKey: "landing.features.classes.desc" },
    { icon: Bot, titleKey: "landing.features.ai.title", descKey: "landing.features.ai.desc" },
    { icon: ShieldCheck, titleKey: "landing.features.security.title", descKey: "landing.features.security.desc" },
  ];

  const stats = [
    { value: 128000, suffix: "+", label: t("landing.stats.users") },
    { value: 46000, suffix: "+", label: t("landing.stats.calls") },
    { value: 89000, suffix: "+", label: t("landing.stats.meetings") },
    { value: 32, suffix: "", label: t("landing.stats.countries") },
  ];

  const steps = [
    { icon: UserPlus, titleKey: "landing.how.step1.title", descKey: "landing.how.step1.desc" },
    { icon: Users, titleKey: "landing.how.step2.title", descKey: "landing.how.step2.desc" },
    { icon: Rocket, titleKey: "landing.how.step3.title", descKey: "landing.how.step3.desc" },
  ];

  const testimonials = [
    { nameKey: "landing.testimonials.t1.name", roleKey: "landing.testimonials.t1.role", textKey: "landing.testimonials.t1.text" },
    { nameKey: "landing.testimonials.t2.name", roleKey: "landing.testimonials.t2.role", textKey: "landing.testimonials.t2.text" },
    { nameKey: "landing.testimonials.t3.name", roleKey: "landing.testimonials.t3.role", textKey: "landing.testimonials.t3.text" },
  ];

  const plans = [
    {
      nameKey: "landing.pricing.free.name",
      price: t("landing.pricing.free.price"),
      unit: "",
      descKey: "landing.pricing.free.desc",
      popular: false,
      features: ["chat", "oneToOne", "storage1", "p10"],
    },
    {
      nameKey: "landing.pricing.pro.name",
      price: t("landing.pricing.pro.price"),
      unit: t("landing.pricing.pro.unit"),
      descKey: "landing.pricing.pro.desc",
      popular: true,
      features: ["chat", "oneToOne", "groupCall", "screenShare", "storage10", "whiteboard", "adminPanel", "aiAssistant", "prioritySupport", "p50"],
    },
    {
      nameKey: "landing.pricing.enterprise.name",
      price: t("landing.pricing.enterprise.price"),
      unit: "",
      descKey: "landing.pricing.enterprise.desc",
      popular: false,
      features: ["chat", "oneToOne", "groupCall", "screenShare", "storageUnlimited", "whiteboard", "adminPanel", "aiAssistant", "prioritySupport", "branding", "api", "pUnlimited"],
    },
  ];

  const faqs = [1, 2, 3, 4, 5, 6] as const;

  const contacts = [
    { icon: Mail, labelKey: "landing.contact.general", email: "hello@asameet.online" },
    { icon: Mail, labelKey: "landing.contact.support", email: "support@asameet.online" },
    { icon: Mail, labelKey: "landing.contact.sales", email: "sales@asameet.online" },
    { icon: Mail, labelKey: "landing.contact.security", email: "security@asameet.online" },
  ];

  return (
    <div className="mesh-bg flex min-h-screen flex-col">
      {/* ================= Navbar ================= */}
      <header className="glass-nav sticky top-0 z-40 safe-area-top">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4" aria-label="Main">
          <a href="#" className="focus-glow rounded-xl">
            <LogoWordmark />
          </a>
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-glow"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="glass" size="sm" className="hidden sm:inline-flex" onClick={() => setShowLoginModal(true)}>
              {t("landing.nav.login")}
            </Button>
            <Button size="sm" onClick={() => setShowLoginModal(true)}>
              {t("landing.nav.start")}
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              className="lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </nav>
        {menuOpen && (
          <div className="border-t border-border/50 px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ================= Hero ================= */}
        <Section className="relative overflow-hidden">
          <div className="dot-pattern pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -top-32 start-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div className="text-center lg:text-start">
              <motion.div variants={fadeUp}>
                <Badge className="mb-5 gap-1.5 px-3 py-1 text-sm">
                  <Sparkles className="size-3.5" />
                  {t("landing.hero.badge")}
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-balance text-4xl font-black leading-[1.15] sm:text-5xl xl:text-6xl">
                {t("landing.hero.title1")} <span className="hero-text-gradient">{t("landing.hero.title2")}</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg lg:mx-0">
                {t("landing.hero.subtitle")}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button size="lg" onClick={() => setShowLoginModal(true)}>
                  <Rocket className="size-5" />
                  {t("landing.hero.ctaPrimary")}
                </Button>
                <Button variant="glass" size="lg" onClick={() => setShowLoginModal(true)}>
                  <PlayCircle className="size-5" />
                  {t("landing.hero.ctaSecondary")}
                </Button>
              </motion.div>
              <motion.p variants={fadeUp} className="mt-5 text-xs text-muted-foreground">
                {t("landing.hero.trust")}
              </motion.p>
            </div>

            {/* Product mockup — hand-built chat preview */}
            <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-md">
              <div className="card-3d glass-strong img-glow rounded-[2rem] p-4 shadow-2xl">
                <div className="mb-3 flex items-center gap-3 border-b border-border/50 pb-3">
                  <Logo size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t("meta.name")}</p>
                    <p className="flex items-center gap-1 text-xs text-emerald-500">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                      {t("common.online")}
                    </p>
                  </div>
                  <Video className="size-5 text-primary" />
                  <Phone className="size-4 text-primary" />
                </div>
                <div className="space-y-2.5">
                  <div className="msg-bubble-other max-w-[85%]">
                    <p className="text-sm">سلام! جلسه ساعت ۱۰ آماده‌ست؟ 👋</p>
                    <span className="mt-1 block text-end text-[10px] opacity-60">۰۹:۵۵</span>
                  </div>
                  <div className="flex justify-end">
                    <div className="msg-bubble-own max-w-[85%]">
                      <p className="text-sm">آره! لینک جلسه رو همین‌جا می‌فرستم ✨</p>
                      <span className="mt-1 block text-end text-[10px] opacity-80">۰۹:۵۶ ✓✓</span>
                    </div>
                  </div>
                  <div className="glass-card flex items-center gap-3 rounded-2xl p-3">
                    <span className="icon-3d-wrap size-9">
                      <Video className="size-4 text-primary" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold">دموی عمومی آسامیت</p>
                      <p className="text-[10px] text-muted-foreground">۶ {t("common.participants")} • {t("meetings.recording")} 🔴</p>
                    </div>
                    <Button size="sm">{t("meetings.join")}</Button>
                  </div>
                  <div className="flex justify-end">
                    <div className="msg-bubble-own max-w-[85%]">
                      <p className="text-sm">🤖 دستیار هوشمند: صورت‌جلسه به‌صورت خودکار نوشته می‌شود</p>
                      <span className="mt-1 block text-end text-[10px] opacity-80">۰۹:۵۷ ✓✓</span>
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
              <div className="animate-float-slow pointer-events-none absolute -end-6 -top-6 hidden rounded-2xl p-3 glass shadow-xl sm:block">
                <Bot className="size-7 text-primary icon-3d" />
              </div>
              <div className="animate-float pointer-events-none absolute -bottom-5 -start-5 hidden rounded-2xl p-3 glass shadow-xl sm:block">
                <ShieldCheck className="size-7 text-emerald-500 icon-3d" />
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ================= Features ================= */}
        <Section id="features" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div variants={fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.features.subtitle")}</p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.article key={f.titleKey} variants={fadeUp} className="glass-card group p-6">
                <span className="icon-3d-wrap mb-4 size-14">
                  <f.icon className="icon-3d size-7 text-primary" />
                </span>
                <h3 className="mb-2 text-lg font-bold">{t(f.titleKey)}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t(f.descKey)}</p>
              </motion.article>
            ))}
          </div>
        </Section>

        {/* ================= Stats ================= */}
        <Section className="relative overflow-hidden py-16">
          <div className="hero-gradient absolute inset-0 opacity-95" />
          <div className="relative mx-auto max-w-6xl px-4">
            <motion.h2 variants={fadeUp} className="mb-10 text-center text-2xl font-black text-white sm:text-3xl">
              {t("landing.stats.title")}
            </motion.h2>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {stats.map((s) => (
                <motion.div key={s.label} variants={fadeUp} className="glass rounded-3xl p-6 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <p className="text-3xl font-black text-white sm:text-4xl">
                    <CountUp target={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-teal-50">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ================= How it works ================= */}
        <Section className="mx-auto max-w-6xl px-4 py-20">
          <motion.div variants={fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.how.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.how.subtitle")}</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div key={s.titleKey} variants={fadeUp} className="glass-card relative p-6 text-center">
                <span className="absolute -top-4 start-6 flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-black text-white shadow-lg">
                  {toLocaleDigits(i + 1, locale)}
                </span>
                <span className="icon-3d-wrap mx-auto mb-4 size-16">
                  <s.icon className="icon-3d size-8 text-primary" />
                </span>
                <h3 className="mb-2 font-bold">{t(s.titleKey)}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t(s.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ================= Testimonials ================= */}
        <Section className="mx-auto max-w-6xl px-4 py-16">
          <motion.h2 variants={fadeUp} className="mb-10 text-center text-3xl font-black">
            {t("landing.testimonials.title")}
          </motion.h2>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((tm) => (
              <motion.figure key={tm.nameKey} variants={fadeUp} className="glass-card flex flex-col p-6">
                <div className="mb-3 flex gap-0.5 text-amber-400" aria-hidden="true">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-7 text-muted-foreground">«{t(tm.textKey)}»</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-sm font-bold text-white">
                    {t(tm.nameKey).slice(0, 1)}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{t(tm.nameKey)}</span>
                    <span className="block text-xs text-muted-foreground">{t(tm.roleKey)}</span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </Section>

        {/* ================= Pricing ================= */}
        <Section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
          <motion.div variants={fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.pricing.subtitle")}</p>
          </motion.div>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <motion.div
                key={p.nameKey}
                variants={fadeUp}
                className={`glass-card relative flex flex-col p-7 ${p.popular ? "border-2 !border-primary shadow-xl shadow-teal-500/10 lg:-translate-y-3" : ""}`}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 start-1/2 -translate-x-1/2 bg-gradient-to-l from-teal-500 to-emerald-600 text-white rtl:translate-x-1/2">
                    {t("landing.pricing.popular")}
                  </Badge>
                )}
                <h3 className="text-lg font-bold">{t(p.nameKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(p.descKey)}</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black">{toLocaleDigits(p.price, locale)}</span>
                  {p.unit && <span className="text-sm text-muted-foreground">{p.unit} / {t("landing.pricing.monthly")}</span>}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((fk) => (
                    <li key={fk} className="flex items-center gap-2.5 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="size-3 text-primary" />
                      </span>
                      {t(`landing.pricing.features.${fk}`)}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-7 w-full"
                  variant={p.popular ? "default" : "glass"}
                  onClick={() => setShowLoginModal(true)}
                >
                  {p.nameKey.includes("enterprise") ? t("landing.pricing.ctaContact") : t("landing.pricing.cta")}
                </Button>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ================= FAQ ================= */}
        <Section id="faq" className="mx-auto max-w-3xl px-4 py-16">
          <motion.h2 variants={fadeUp} className="mb-10 text-center text-3xl font-black">
            {t("landing.faq.title")}
          </motion.h2>
          <motion.div variants={fadeUp}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((n) => (
                <AccordionItem key={n} value={`q${n}`} className="border-none">
                  <AccordionTrigger>{t(`landing.faq.q${n}`)}</AccordionTrigger>
                  <AccordionContent>{t(`landing.faq.a${n}`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </Section>

        {/* ================= About ================= */}
        <Section id="about" className="mx-auto max-w-6xl px-4 py-20">
          <motion.div variants={fadeUp} className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-black sm:text-4xl">{t("landing.about.title")}</h2>
            <p className="mt-3 text-lg text-primary">{t("landing.about.subtitle")}</p>
          </motion.div>
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <motion.div variants={fadeUp} className="space-y-4 leading-8 text-muted-foreground">
              <p>{t("landing.about.text1")}</p>
              <p>{t("landing.about.text2")}</p>
              <p>{t("landing.about.text3")}</p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { v: 17, suffix: "", label: t("landing.about.stats.members") },
                  { v: 9, suffix: "", label: t("landing.about.stats.countries") },
                  { v: 7, suffix: "", label: t("landing.about.stats.timezones") },
                  { v: 100, suffix: "٪", label: t("landing.about.stats.remote") },
                ].map((s) => (
                  <div key={s.label} className="glass-card p-4 text-center">
                    <p className="text-2xl font-black text-primary">
                      <CountUp target={s.v} suffix={s.suffix} />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-card p-7">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                <Globe2 className="size-5 text-primary icon-3d" />
                {t("landing.about.values.title")}
              </h3>
              <div className="space-y-5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3.5">
                    <span className="icon-3d-wrap size-10 shrink-0">
                      {n === 1 ? <Users className="size-5 text-primary" /> : n === 2 ? <ShieldCheck className="size-5 text-primary" /> : <Heart className="size-5 text-primary" />}
                    </span>
                    <div>
                      <p className="font-bold">{t(`landing.about.values.v${n}.title`)}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`landing.about.values.v${n}.desc`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ================= Contact ================= */}
        <Section id="contact" className="mx-auto max-w-5xl px-4 py-16">
          <motion.div variants={fadeUp} className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-black">{t("landing.contact.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.contact.subtitle")}</p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contacts.map((c) => (
              <motion.a
                key={c.email}
                variants={fadeUp}
                href={`mailto:${c.email}`}
                className="glass-card group flex flex-col items-center gap-3 p-6 text-center focus-glow"
              >
                <span className="icon-3d-wrap size-12">
                  <c.icon className="icon-3d size-6 text-primary" />
                </span>
                <span className="text-sm font-bold">{t(c.labelKey)}</span>
                <span className="text-xs text-primary" dir="ltr">
                  {c.email}
                </span>
              </motion.a>
            ))}
          </div>
          <motion.p variants={fadeUp} className="mt-6 text-center text-xs text-muted-foreground">
            {t("landing.contact.note")}
          </motion.p>
        </Section>

        {/* ================= Final CTA ================= */}
        <Section className="mx-auto max-w-5xl px-4 pb-24 pt-6">
          <motion.div variants={fadeUp} className="hero-gradient relative overflow-hidden rounded-[2.5rem] p-10 text-center shadow-2xl sm:p-14">
            <div className="dot-pattern absolute inset-0 opacity-20" />
            <div className="relative">
              <Logo size={72} className="icon-3d animate-float mx-auto mb-6" />
              <h2 className="text-balance text-3xl font-black text-white sm:text-4xl">{t("landing.cta.title")}</h2>
              <p className="mt-3 text-teal-50">{t("landing.cta.subtitle")}</p>
              <Button
                size="lg"
                className="mt-8 !bg-white !text-teal-700 hover:!bg-teal-50"
                onClick={() => setShowLoginModal(true)}
              >
                <Rocket className="size-5" />
                {t("landing.cta.button")}
              </Button>
            </div>
          </motion.div>
        </Section>
      </main>

      {/* ================= Footer ================= */}
      <footer className="glass-nav mt-auto border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <LogoWordmark />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("meta.description")}</p>
            </div>
            <nav aria-label={t("landing.footer.product")}>
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.product")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary">{t("landing.nav.features")}</a></li>
                <li><a href="#pricing" className="hover:text-primary">{t("landing.nav.pricing")}</a></li>
                <li><a href="#faq" className="hover:text-primary">{t("landing.nav.faq")}</a></li>
              </ul>
            </nav>
            <nav aria-label={t("landing.footer.company")}>
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.company")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-primary">{t("landing.nav.about")}</a></li>
                <li><a href="#contact" className="hover:text-primary">{t("landing.nav.contact")}</a></li>
                <li><a href="#" className="hover:text-primary">{t("landing.footer.privacy")}</a></li>
                <li><a href="#" className="hover:text-primary">{t("landing.footer.terms")}</a></li>
              </ul>
            </nav>
            <div>
              <h3 className="mb-3 text-sm font-bold">{t("landing.footer.downloadApp")}</h3>
              <div className="space-y-2.5">
                <a
                  href="https://github.com/sinaaghaahmadi/q/releases"
                  className="glass-card flex items-center gap-3 p-3 text-sm font-medium focus-glow"
                >
                  <Smartphone className="size-5 text-primary icon-3d" />
                  {t("landing.footer.androidApp")}
                </a>
                <a
                  href="https://github.com/sinaaghaahmadi/q/releases"
                  className="glass-card flex items-center gap-3 p-3 text-sm font-medium focus-glow"
                >
                  <MessageSquare className="size-5 text-primary icon-3d" />
                  {t("landing.footer.messengerApp")}
                </a>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="glass-card flex w-full items-center gap-3 p-3 text-sm font-medium focus-glow cursor-pointer"
                >
                  <MonitorSmartphone className="size-5 text-primary icon-3d" />
                  {t("landing.footer.pwa")}
                  <Download className="ms-auto size-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-start">
            <p>
              © {toLocaleDigits(new Date().getFullYear(), locale)} {t("meta.name")} — {t("landing.footer.rights")}
            </p>
            <p className="flex items-center gap-1.5">
              {t("landing.footer.madeWith")}
              <Heart className="size-4 fill-red-500 text-red-500 animate-pulse" aria-label="❤" />
              {t("landing.footer.byIranians")} · <span className="font-bold text-foreground">{t("landing.footer.groupName")}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
