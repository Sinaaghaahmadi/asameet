"use client";

/**
 * "Add to home screen" prompt.
 *
 * Chromium hands us the event to replay later, so the prompt appears on our
 * own terms rather than the browser's mini-infobar. iOS Safari has no such
 * event and installs only from the share sheet, so there it becomes a short
 * instruction instead. Either way it is shown once and remembered.
 */
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { GBtn } from "./glass";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED = "asatalk-install-dismissed";

const standalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios/i.test(navigator.userAgent);

export function InstallPrompt() {
  const t = useT();
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (standalone() || localStorage.getItem(DISMISSED)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // iOS never fires the event; wait a beat so it does not greet a new user.
    const id = isIos()
      ? window.setTimeout(() => setIos(true), 20_000)
      : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (id) window.clearTimeout(id);
    };
  }, []);

  if (!evt && !ios) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED, "1");
    setEvt(null);
    setIos(false);
  };

  return (
    <div className="tg-glass-strong fixed inset-x-3 bottom-3 z-[70] flex items-center gap-3 rounded-2xl p-3 shadow-lg">
      <span className="bg-talk grid size-10 shrink-0 place-items-center rounded-xl text-white">
        {ios ? <Share className="size-5" /> : <Download className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{t("pwa.installTitle")}</span>
        <span className="tg-muted block text-xs leading-5">
          {ios ? t("pwa.installIos") : t("pwa.installDesc")}
        </span>
      </span>
      {!ios && (
        <GBtn
          variant="primary"
          size="sm"
          onClick={async () => {
            const e = evt;
            dismiss();
            await e?.prompt().catch(() => {});
          }}
        >
          {t("pwa.install")}
        </GBtn>
      )}
      <button
        type="button"
        aria-label={t("pwa.later")}
        className="tg-muted p-1"
        onClick={dismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
