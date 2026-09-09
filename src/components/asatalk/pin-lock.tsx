"use client";

/** PIN lock screen (local passcode stored in settings.pinLock as a salted hash). */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Delete, Fingerprint } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { cn, toLocaleDigits } from "@/lib/utils";
import { Mascot } from "./mascots";

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`asatalk:${pin}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function PinScreen({
  mode,
  hash,
  onDone,
  onCancel,
  onForgot,
}: {
  mode: "set" | "verify";
  hash?: string;
  onDone: (pinHash: string) => void;
  onCancel?: () => void;
  onForgot?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const title =
    mode === "verify"
      ? t("talk.pin.title")
      : first
        ? t("talk.pin.confirmTitle")
        : t("talk.pin.setTitle");

  useEffect(() => {
    if (pin.length !== 6 || busy) return;
    setBusy(true);
    void (async () => {
      const h = await hashPin(pin);
      if (mode === "verify") {
        if (h === hash) return onDone(h);
        fail(t("talk.pin.wrong"));
      } else if (!first) {
        setFirst(h);
        setPin("");
      } else if (first === h) {
        return onDone(h);
      } else {
        setFirst(null);
        fail(t("talk.pin.mismatch"));
      }
      setBusy(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function fail(_msg: string) {
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
    setPin("");
    setError(_msg);
  }
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 6 ? p + e.key : p));
      if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      if (e.key === "Escape" && onCancel) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="talk tg-wall z-lock fixed inset-0 flex flex-col items-center justify-between px-6 pt-16 pb-8"
      data-wall="gradient"
      role="dialog"
      aria-label={title}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Mascot pose="lock" size={100} />
        <h1 className="text-heading font-black">{title}</h1>
        <motion.div
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-2 flex gap-3"
          dir="ltr"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="tg-pin-dot" data-on={i < pin.length} />
          ))}
        </motion.div>
        <p
          className={cn(
            "text-preview min-h-5 font-semibold text-red-500 transition-opacity",
            error ? "opacity-100" : "opacity-0",
          )}
        >
          {error}
        </p>
      </div>
      <div className="w-full max-w-xs">
        <div className="tg-numpad" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              className="tg-ripple hover:bg-talk-hover"
              onClick={() => setPin((p) => (p.length < 6 ? p + d : p))}
            >
              {toLocaleDigits(d, locale)}
            </button>
          ))}
          <button
            type="button"
            className="text-talk flex items-center justify-center"
            aria-label={t("talk.pin.biometric")}
            onClick={() => setError(t("talk.conv.soon"))}
          >
            <Fingerprint className="size-6" />
          </button>
          <button
            type="button"
            className="tg-ripple hover:bg-talk-hover"
            onClick={() => setPin((p) => (p.length < 6 ? p + "0" : p))}
          >
            {toLocaleDigits(0, locale)}
          </button>
          <button
            type="button"
            aria-label="backspace"
            className="flex items-center justify-center"
            onClick={() => setPin((p) => p.slice(0, -1))}
          >
            <Delete className="size-6" />
          </button>
        </div>
        <div className="text-body mt-4 flex justify-center gap-4 font-semibold">
          {mode === "verify" && onForgot && (
            <button type="button" className="text-talk" onClick={onForgot}>
              {t("talk.pin.forgot")}
            </button>
          )}
          {onCancel && (
            <button type="button" className="tg-muted" onClick={onCancel}>
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
