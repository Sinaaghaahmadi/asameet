"use client";

/**
 * Asatalk onboarding, per the mobile design hand-off:
 * language → splash → sign-in (phone / email, username+password, or a QR
 * approved on a device that is already signed in) → OTP → profile (name,
 * username, avatar) → notification permission.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Check,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { talkApi, TalkApiError } from "@/lib/talk/api";
import { enablePush } from "@/lib/talk/presence";
import { makeAvatarDataUrl } from "@/lib/talk/media";
import { LOCALES, useLocale, useT, type Locale } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import type { User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { GBtn, TalkAvatar } from "./glass";
import { QrImage } from "./qr";
import { Mascot } from "./mascots";
import { TalkPortal } from "./portal";

type Step =
  "lang" | "splash" | "signin" | "password" | "otp" | "qr" | "profile" | "perm";

const LANG_STORAGE = "asatalk-lang-chosen";

function detectKind(v: string): "phone" | "email" | null {
  const s = v.trim();
  if (!s) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "email";
  const digits = s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s()+-]/g, "");
  if (/^\d{10,15}$/.test(digits)) return "phone";
  return null;
}

export function Onboarding({
  onLogin,
  addAccount,
  onCancel,
}: {
  onLogin: (u: User) => void;
  addAccount?: boolean;
  onCancel?: () => void;
}) {
  const t = useT();
  const { dir, locale, setLocale } = useLocale();
  const patchSettings = useTalkStore((s) => s.patchSettings);
  const [step, setStep] = useState<Step>(() => {
    if (addAccount) return "signin";
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(LANG_STORAGE)
    )
      return "splash";
    return "lang";
  });
  const [identifier, setIdentifier] = useState("");
  const [kind, setKind] = useState<"phone" | "email" | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const pendingUser = useRef<User | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const Next = dir === "rtl" ? ArrowLeft : ArrowRight;

  function fail(e: unknown) {
    const c = e instanceof TalkApiError ? e.code : "network";
    const key = `talk.errors.${c}`;
    const msg = t(key);
    toast.error(msg === key ? t("talk.errors.generic") : msg);
  }

  /* ---------- OTP request / verify ---------- */
  async function requestCode() {
    if (!detectKind(identifier)) return;
    setBusy(true);
    try {
      const res = await talkApi.otpRequest(identifier);
      setKind(res.kind);
      setDemoCode(res.demoCode ?? null);
      setTtl(Math.min(res.ttl ?? 120, 120));
      setCode("");
      setStep("otp");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "otp" || ttl <= 0) return;
    const id = window.setTimeout(() => setTtl((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [step, ttl]);

  async function verify(full: string) {
    setBusy(true);
    try {
      const { user, isNew } = await talkApi.otpVerify(identifier, full);
      if (isNew) {
        pendingUser.current = user;
        setProfileName("");
        setStep("profile");
      } else {
        finish(user);
      }
    } catch (e) {
      const c = e instanceof TalkApiError ? e.code : "network";
      if (c === "invalid_credentials" || c === "invalid_code") {
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
        setCode("");
        toast.error(t("talk.onboard.wrongCode"));
      } else fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      const { user } = await talkApi.login(username.trim(), password);
      finish(user);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!profileName.trim()) return;
    setBusy(true);
    try {
      const { user } = await talkApi.updateProfile({
        displayName: profileName.trim(),
        ...(profileUsername.trim()
          ? { username: profileUsername.trim().replace(/^@/, "") }
          : {}),
        ...(avatar ? { avatar } : {}),
      });
      pendingUser.current = user;
      setStep("perm");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function finish(user: User) {
    toast.success(`${t("talk.onboarding.welcome")} 👋 ${user.displayName}`);
    onLogin(user);
  }

  function chooseLang(l: Locale) {
    setLocale(l);
  }

  const wallOpts = {
    className: cn(
      "talk relative flex min-h-dvh flex-col overflow-hidden",
      step === "splash" ? "tg-call-bg" : "tg-wall",
    ),
    "data-wall": "gradient",
  } as const;

  /* ---------- screens ---------- */
  return (
    <div {...wallOpts}>
      <AnimatePresence mode="wait">
        {/* 1 · language */}
        {step === "lang" && (
          <Screen key="lang">
            <div className="flex flex-1 flex-col px-6 pt-14">
              <Mascot pose="wave" size={110} className="mx-auto" />
              <h1 className="text-display mt-3 text-center font-black">
                {t("talk.onboard.langTitle")}
              </h1>
              <p className="tg-muted mt-1 text-center text-sm">
                {t("talk.onboard.langSub")}
              </p>
              <div className="mt-7 grid gap-2.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className="tg-lang tg-glass"
                    data-active={locale === l.code}
                    onClick={() => chooseLang(l.code)}
                    dir={l.code === "fa" || l.code === "ar" ? "rtl" : "ltr"}
                  >
                    <span className="text-display leading-none">{l.flag}</span>
                    <span className="flex-1 text-start text-[15px] font-bold">
                      {l.label}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full transition",
                        locale === l.code
                          ? "bg-talk text-white"
                          : "border-talk-line border-2",
                      )}
                    >
                      {locale === l.code && (
                        <Check className="size-3.5" strokeWidth={3} />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6 pb-8">
                <GBtn
                  variant="primary"
                  size="lg"
                  className="h-[52px] w-full"
                  onClick={() => {
                    try {
                      window.localStorage.setItem(LANG_STORAGE, locale);
                    } catch {}
                    setStep("splash");
                  }}
                >
                  {t("talk.onboard.continueBtn")} <Next className="size-4" />
                </GBtn>
              </div>
            </div>
          </Screen>
        )}

        {/* 2 · splash */}
        {step === "splash" && (
          <Screen key="splash">
            <div className="z-chrome relative flex flex-1 flex-col items-center justify-center px-7 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <Mascot pose="party" size={220} />
              </motion.div>
              <motion.h1
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mt-2 text-[40px] leading-tight font-black text-white drop-shadow"
              >
                {t("talk.name")}
              </motion.h1>
              <motion.p
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mt-1 text-[15px] text-white/80"
              >
                {t("talk.tagline")}
              </motion.p>
              <SplashDots />
            </div>
            <div className="z-chrome relative grid gap-3 px-6 pb-10">
              <GBtn
                variant="primary"
                size="lg"
                className="h-[52px] w-full"
                onClick={() => setStep("signin")}
              >
                {t("talk.onboard.start")} <Next className="size-4" />
              </GBtn>
              <GBtn
                variant="ghost"
                size="lg"
                className="h-[48px] w-full text-white"
                onClick={() => setStep("signin")}
              >
                {t("talk.onboard.haveAccount")}
              </GBtn>
              <button
                type="button"
                className="mt-1 text-xs text-white/60"
                onClick={() => setStep("lang")}
              >
                {LOCALES.find((l) => l.code === locale)?.flag}{" "}
                {LOCALES.find((l) => l.code === locale)?.label}
              </button>
            </div>
          </Screen>
        )}

        {/* 3 · sign-in */}
        {step === "signin" && (
          <Screen key="signin">
            <form
              className="flex flex-1 flex-col px-6 pt-10"
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
            >
              <Mascot pose="phone" size={130} className="mx-auto" />
              <h1 className="mt-2 text-center text-[24px] font-black">
                {t("talk.onboard.signinTitle")}
              </h1>
              <p className="tg-muted text-body mx-auto mt-1 max-w-xs text-center leading-6">
                {t("talk.onboard.signinSub")}
              </p>
              <div className="mt-6 flex items-stretch gap-2" dir="ltr">
                <span
                  className="tg-glass flex shrink-0 items-center rounded-2xl px-3 text-[15px] font-bold"
                  aria-hidden
                >
                  {detectKind(identifier) === "email"
                    ? "@"
                    : `+${toLocaleDigits(98, locale)}`}
                </span>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("talk.onboard.identifier")}
                  className="tg-input h-[52px] flex-1 text-left text-[16px]"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  dir="ltr"
                />
              </div>
              <p
                className={cn(
                  "text-talk mt-2 min-h-5 text-center text-[12px] font-semibold transition-opacity",
                  detectKind(identifier) ? "opacity-100" : "opacity-0",
                )}
              >
                {detectKind(identifier) === "email"
                  ? t("talk.onboard.detectedEmail")
                  : t("talk.onboard.detectedPhone")}
              </p>
              <GBtn
                type="submit"
                variant="primary"
                size="lg"
                className="mt-3 h-[52px] w-full"
                disabled={busy || !detectKind(identifier)}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("talk.onboard.getCode")}
              </GBtn>
              <div className="my-5 flex items-center gap-3 text-[12px]">
                <span className="bg-talk-line h-px flex-1" />
                <span className="tg-muted">{t("talk.onboard.or")}</span>
                <span className="bg-talk-line h-px flex-1" />
              </div>
              <GBtn
                size="lg"
                className="h-[48px] w-full"
                type="button"
                onClick={() => setStep("qr")}
              >
                <QrCode className="size-4" /> {t("talk.onboard.qr")}
              </GBtn>
              <GBtn
                size="lg"
                className="mt-2 h-[48px] w-full"
                onClick={() => setStep("password")}
              >
                <KeyRound className="size-4" /> {t("talk.onboard.password")}
              </GBtn>
              <p className="tg-muted text-caption mt-auto pt-6 pb-8 text-center leading-5">
                {t("talk.onboard.terms")}
              </p>
              {(onCancel || !addAccount) && (
                <BackBtn
                  onClick={() => (onCancel ? onCancel() : setStep("splash"))}
                />
              )}
            </form>
          </Screen>
        )}

        {/* 3b · username + password fallback */}
        {step === "password" && (
          <Screen key="password">
            <form
              className="flex flex-1 flex-col px-6 pt-10"
              onSubmit={(e) => {
                e.preventDefault();
                void submitPassword();
              }}
            >
              <BackBtn onClick={() => setStep("signin")} />
              <Mascot pose="lock" size={120} className="mx-auto" />
              <h1 className="text-heading mt-2 text-center font-black">
                {t("talk.onboard.password")}
              </h1>
              <div className="mt-6 grid gap-3">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("talk.onboarding.username")}
                  className="tg-input h-[52px] text-left"
                  dir="ltr"
                  autoComplete="username"
                  autoFocus
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("talk.onboarding.password")}
                  className="tg-input h-[52px] text-left"
                  dir="ltr"
                  autoComplete="current-password"
                />
              </div>
              <GBtn
                type="submit"
                variant="primary"
                size="lg"
                className="mt-4 h-[52px] w-full"
                disabled={busy || !username.trim() || !password}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("talk.onboarding.login")}
              </GBtn>
            </form>
          </Screen>
        )}

        {/* 4 · OTP */}
        {step === "otp" && (
          <Screen key="otp">
            <div className="flex flex-1 flex-col px-6 pt-10">
              <BackBtn onClick={() => setStep("signin")} />
              <h1 className="mt-4 text-center text-[24px] font-black">
                {t("talk.onboard.otpTitle")}
              </h1>
              <p className="tg-muted text-body mt-1 text-center leading-6">
                {t("talk.onboard.otpSentTo").replace("{id}", identifier)}{" "}
                <button
                  type="button"
                  className="text-talk font-semibold"
                  onClick={() => setStep("signin")}
                >
                  {t("talk.onboard.change")}
                </button>
              </p>
              {demoCode && (
                <button
                  type="button"
                  className="tg-glass mx-auto mt-3 rounded-full px-4 py-1.5 text-[12px] font-bold"
                  onClick={() => setCode(demoCode)}
                  dir="ltr"
                >
                  {t("talk.onboard.demoCode")}:{" "}
                  <span className="text-talk tracking-[0.3em]">{demoCode}</span>
                </button>
              )}
              {/* The boxes are decoration over one real input, so the code
                  is typed on the device keyboard and SMS autofill works. */}
              <motion.label
                animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
                className="relative mt-7 flex justify-center gap-2"
                dir="ltr"
              >
                <input
                  ref={codeRef}
                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(v);
                    if (v.length === 6) void verify(v);
                  }}
                  aria-label={t("talk.onboard.codeTitle")}
                />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="tg-otp tg-glass"
                    data-active={i === code.length}
                  >
                    {code[i] ? (
                      toLocaleDigits(code[i], locale)
                    ) : i === code.length ? (
                      <span className="tg-caret" />
                    ) : null}
                  </div>
                ))}
              </motion.label>
              <p className="tg-muted text-preview mt-4 text-center">
                {ttl > 0 ? (
                  <>
                    {t("talk.onboard.resendIn")}{" "}
                    <span dir="ltr">
                      {toLocaleDigits(
                        `${Math.floor(ttl / 60)}:${String(ttl % 60).padStart(2, "0")}`,
                        locale,
                      )}
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-talk font-semibold"
                    onClick={() => void requestCode()}
                  >
                    {t("talk.onboard.resend")}
                  </button>
                )}
              </p>
              {busy && (
                <Loader2 className="text-talk mx-auto mt-2 size-5 animate-spin" />
              )}
            </div>
          </Screen>
        )}

        {/* 4b · sign in by QR approved on another device */}
        {step === "qr" && (
          <Screen key="qr">
            <QrSignIn onLogin={finish} onBack={() => setStep("signin")} />
          </Screen>
        )}

        {/* 5 · profile */}
        {step === "profile" && (
          <Screen key="profile">
            <form
              className="flex flex-1 flex-col px-6 pt-12"
              onSubmit={(e) => {
                e.preventDefault();
                void saveProfile();
              }}
            >
              <h1 className="text-center text-[24px] font-black">
                {t("talk.onboard.whoTitle")}
              </h1>
              <p className="tg-muted text-body mt-1 text-center">
                {t("talk.onboard.whoSub")}
              </p>
              <label className="relative mx-auto mt-7 block cursor-pointer">
                {avatar ? (
                  <TalkAvatar
                    name={profileName || "?"}
                    src={avatar}
                    size="xxl"
                  />
                ) : (
                  <span className="tg-glass flex size-[120px] items-center justify-center overflow-hidden rounded-full">
                    <Mascot pose="love" size={96} animate={false} />
                  </span>
                )}
                <span className="border-talk-bg bg-talk absolute end-0 -bottom-1 flex size-9 items-center justify-center rounded-full border-2 text-white shadow">
                  <Camera className="size-4" />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setAvatar(await makeAvatarDataUrl(f));
                  }}
                />
              </label>
              <div className="mt-7 grid gap-3">
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t("talk.onboard.name")}
                  className="tg-input h-[52px]"
                  autoComplete="name"
                  maxLength={64}
                  autoFocus
                />
                <input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder={t("talk.onboard.username")}
                  className="tg-input h-[52px] text-left"
                  dir="ltr"
                  autoComplete="off"
                  maxLength={32}
                />
                <p className="tg-hint !px-1">
                  {t("talk.onboard.usernameHint")}
                </p>
              </div>
              <div className="mt-auto pt-6 pb-8">
                <GBtn
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="h-[52px] w-full"
                  disabled={busy || !profileName.trim()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("talk.onboard.continueBtn")} <Next className="size-4" />
                </GBtn>
              </div>
            </form>
          </Screen>
        )}

        {/* 6 · permissions */}
        {step === "perm" && (
          <Screen key="perm">
            <PermissionSheets
              onDone={() => {
                patchSettings({ onboarded: true });
                void talkApi
                  .updateSettings({ onboarded: true })
                  .catch(() => {});
                if (pendingUser.current) finish(pendingUser.current);
              }}
            />
          </Screen>
        )}
      </AnimatePresence>
      <p className="tg-muted text-meta pointer-events-none absolute inset-x-0 bottom-1 text-center">
        {t("talk.onboarding.poweredBy")}
      </p>
    </div>
  );
}

/**
 * Sign in by QR. This device asks for a ticket, shows it as a code and waits;
 * a device already signed in scans it and approves. Approval mints the
 * session server-side and it reaches us as an httpOnly cookie — the token
 * itself never touches this page.
 *
 * The code encodes a link to /qr, so the phone's own camera app is a valid
 * scanner; no in-app scanner is required on either side.
 */
function QrSignIn({
  onLogin,
  onBack,
}: {
  onLogin: (u: User) => void;
  onBack: () => void;
}) {
  const t = useT();
  const [code, setCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setCode(null);
    setFailed(false);
    talkApi
      .qrCreate()
      .then((r) => {
        if (!alive) return;
        setCode(r.code);
        setTtl(r.ttl ?? 180);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [nonce]);

  // Countdown; the ticket dies with it and a fresh one has to be asked for.
  useEffect(() => {
    if (!code || ttl <= 0) return;
    const id = window.setTimeout(() => setTtl((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [code, ttl]);

  useEffect(() => {
    if (!code || ttl <= 0) return;
    let alive = true;
    const id = window.setInterval(async () => {
      try {
        const r = await talkApi.qrPoll(code);
        if (!alive) return;
        if (r.status === "approved" && r.user) {
          window.clearInterval(id);
          onLogin(r.user);
        } else if (r.status === "rejected" || r.status === "expired") {
          window.clearInterval(id);
          setTtl(0);
        }
      } catch {
        /* a dropped poll is retried on the next tick */
      }
    }, 2000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [code, ttl, onLogin]);

  const expired = !failed && code !== null && ttl <= 0;
  const link =
    typeof window !== "undefined" && code
      ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/qr#${code}`
      : "";

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-14 text-center">
      <h1 className="text-[24px] font-black">{t("talk.onboard.qrTitle")}</h1>
      <p className="tg-muted text-body mt-1 leading-6">
        {t("talk.onboard.qrSub")}
      </p>
      <div className="tg-glass relative mt-8 grid size-[248px] place-items-center rounded-3xl p-3">
        {failed || expired ? (
          <button
            type="button"
            className="text-talk flex flex-col items-center gap-2 text-sm font-semibold"
            onClick={() => setNonce((n) => n + 1)}
          >
            <RefreshCw className="size-7" />
            {t(failed ? "talk.errors.generic" : "talk.onboard.qrExpired")}
          </button>
        ) : code ? (
          <QrImage value={link} size={220} className="rounded-xl" />
        ) : (
          <Loader2 className="text-talk size-7 animate-spin" />
        )}
      </div>
      <ol className="tg-muted mt-6 space-y-1.5 text-start text-[13px] leading-6">
        <li>۱ — {t("talk.onboard.qrStep1")}</li>
        <li>۲ — {t("talk.onboard.qrStep2")}</li>
        <li>۳ — {t("talk.onboard.qrStep3")}</li>
      </ol>
      <BackBtn onClick={onBack} />
    </div>
  );
}

function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-md flex-col",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  const { dir } = useLocale();
  const t = useT();
  const Icon = dir === "rtl" ? ArrowRight : ArrowLeft;
  return (
    <button
      type="button"
      aria-label={t("common.back")}
      onClick={onClick}
      className="tg-glass absolute start-4 top-4 flex size-10 items-center justify-center rounded-full"
    >
      <Icon className="size-5" />
    </button>
  );
}

function SplashDots() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % 3), 900);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="mt-6 flex gap-1.5">
      {[0, 1, 2].map((k) => (
        <span
          key={k}
          className={cn(
            "h-1.5 rounded-full bg-white transition-all duration-300",
            k === i ? "w-6 opacity-100" : "w-1.5 opacity-40",
          )}
        />
      ))}
    </div>
  );
}

function PermissionSheets({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  /**
   * Only notifications are asked for here. The microphone and the camera are
   * requested by the call itself, at the moment they are actually used —
   * a permission prompt on the way in reads as an app that wants to listen.
   */
  async function allowNotif() {
    setBusy(true);
    try {
      if ("Notification" in window) {
        const r = await Notification.requestPermission();
        // Push is what reaches the phone with the app closed.
        if (r === "granted") await enablePush();
      }
    } catch {}
    setBusy(false);
    onDone();
  }
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 opacity-60">
        <Mascot pose="wave" size={150} />
      </div>
      <TalkPortal>
        <div className="tg-sheet-backdrop" />
        <div className="tg-sheet tg-glass-strong">
          <span className="tg-sheet-handle" />
          <Mascot pose="bell" size={120} />
          <h2 className="text-[20px] font-black">
            {t("talk.onboard.notifTitle")}
          </h2>
          <p className="tg-muted text-body leading-6">
            {t("talk.onboard.notifSub")}
          </p>
          <GBtn
            variant="primary"
            size="lg"
            className="h-[52px] w-full"
            disabled={busy}
            onClick={() => void allowNotif()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bell className="size-4" />
            )}
            {t("talk.onboard.turnOn")}
          </GBtn>
          <button
            type="button"
            className="tg-muted text-sm font-semibold"
            onClick={onDone}
          >
            {t("talk.onboard.notNow")}
          </button>
        </div>
      </TalkPortal>
    </div>
  );
}
