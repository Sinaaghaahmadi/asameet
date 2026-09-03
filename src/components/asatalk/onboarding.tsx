"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { talkApi, TalkApiError } from "@/lib/talk/api";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { GBtn } from "./glass";
import { AsatalkLogo, Mascot, type MascotPose } from "./mascots";

const SLIDES: { pose: MascotPose; hue?: number }[] = [
  { pose: "wave" },
  { pose: "video", hue: 150 },
  { pose: "group", hue: 300 },
  { pose: "party", hue: 40 },
];

export function Onboarding({ onLogin, addAccount, onCancel }: { onLogin: (u: User) => void; addAccount?: boolean; onCancel?: () => void }) {
  const t = useT();
  const { dir } = useLocale();
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState<null | "login" | "signup">(addAccount ? "login" : null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4200);
    return () => window.clearInterval(id);
  }, [mode]);

  async function submit() {
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      const { user } = mode === "signup" ? await talkApi.signup(username.trim(), password, displayName.trim() || username.trim()) : await talkApi.login(username.trim(), password);
      toast.success(`${t("talk.onboarding.welcome")} 👋 ${user.displayName}`);
      onLogin(user);
    } catch (e) {
      const code = e instanceof TalkApiError ? e.code : "network";
      const key = `talk.errors.${code}`;
      const msg = t(key);
      toast.error(msg === key ? t("talk.errors.generic") : msg);
    } finally {
      setBusy(false);
    }
  }

  const Next = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="talk tg-wall relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-4" data-wall="gradient">
      <div className="absolute end-3 top-3 z-10">
        <LanguageSwitcher />
      </div>
      <div className="tg-glass-strong relative w-full max-w-md overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-center gap-2">
          <AsatalkLogo size={36} />
          <span className="text-xl font-black">{t("talk.name")}</span>
        </div>

        <AnimatePresence mode="wait">
          {!mode ? (
            <motion.div key="slides" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="text-center">
              <div className="relative mx-auto flex h-52 items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div key={slide} initial={{ opacity: 0, scale: 0.8, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: 6 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                    <Mascot pose={SLIDES[slide].pose} hue={SLIDES[slide].hue} size={230} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={`t${slide}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <h1 className="text-2xl font-black">{t(`talk.onboarding.s${slide + 1}Title`)}</h1>
                  <p className="tg-muted mx-auto mt-2 max-w-xs text-sm leading-6">{t(`talk.onboarding.s${slide + 1}Desc`)}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-4 flex justify-center gap-1.5">
                {SLIDES.map((_, i) => (
                  <button key={i} type="button" aria-label={`slide ${i + 1}`} onClick={() => setSlide(i)} className={cn("h-1.5 rounded-full transition-all", i === slide ? "w-6 bg-[var(--talk)]" : "w-1.5 bg-[var(--talk-line)]")} />
                ))}
              </div>
              <GBtn variant="primary" size="lg" className="mt-6 w-full" onClick={() => setMode("signup")}>
                {t("talk.onboarding.start")} <Next className="size-4" />
              </GBtn>
              <button type="button" className="mt-3 text-sm font-semibold text-[var(--talk)]" onClick={() => setMode("login")}>
                {t("talk.onboarding.haveAccount")}
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="flex justify-center">
                <Mascot pose={mode === "signup" ? "party" : "cool"} size={150} />
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[oklch(0.5_0.05_var(--talk-h)/0.1)] p-1" role="tablist">
                {(["login", "signup"] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("rounded-xl px-3 py-2 text-sm font-bold transition", mode === m ? "tg-glass-strong" : "tg-muted")}>
                    {t(m === "login" ? "talk.onboarding.login" : "talk.onboarding.signup")}
                  </button>
                ))}
              </div>
              {mode === "signup" && <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("talk.onboarding.displayName")} className="tg-input" autoComplete="name" maxLength={64} />}
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("talk.onboarding.username")} className="tg-input text-left" dir="ltr" autoComplete="username" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("talk.onboarding.password")} className="tg-input text-left" dir="ltr" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              {mode === "signup" && <p className="tg-hint !px-1">{t("login.usernameHint")} · {t("login.passwordHint")}</p>}
              <GBtn type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !username.trim() || !password}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t(mode === "signup" ? "talk.onboarding.signup" : "talk.onboarding.login")}
              </GBtn>
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="font-semibold text-[var(--talk)]" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                  {t(mode === "login" ? "talk.onboarding.noAccount" : "talk.onboarding.haveAccount")}
                </button>
                {onCancel ? (
                  <button type="button" className="tg-muted" onClick={onCancel}>
                    {t("common.cancel")}
                  </button>
                ) : (
                  <button type="button" className="tg-muted" onClick={() => setMode(null)}>
                    {t("common.back")}
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <p className="tg-muted mt-4 text-center text-[11px]">{t("talk.onboarding.poweredBy")}</p>
    </div>
  );
}
