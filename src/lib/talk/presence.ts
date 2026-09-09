"use client";

/**
 * Presence and web-push wiring.
 *
 * Presence used to be inferred from "made an API call recently", which meant
 * a background tab polling for chats looked online forever and a closed app
 * stayed online for a minute and a half. Instead the client now holds an
 * explicit lease: renewed while the page is visible, released the instant it
 * is hidden or closed.
 */
import { useEffect } from "react";
import { talkApi } from "@/lib/talk/api";

const RENEW_MS = 25_000; // the server lease is 50s, so one missed beat is fine
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Fire-and-forget release that survives the page going away. */
function release() {
  const url = `${BASE}/api/presence?state=offline`;
  if (navigator.sendBeacon?.(url, new Blob([], { type: "text/plain" }))) return;
  void fetch(url, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}

export function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      if (document.hidden) return;
      void talkApi.presence("online").catch(() => {});
    };
    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, RENEW_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        release();
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", release);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [enabled]);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Register this browser for web push once notifications are granted. Safe to
 * call repeatedly: an existing subscription is re-sent so the server can
 * refresh it, and a key change re-subscribes.
 */
export async function enablePush(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  )
    return false;
  try {
    const { key } = await talkApi.pushKey();
    if (!key) return false;
    const reg = await navigator.serviceWorker.ready;
    const appKey = urlBase64ToUint8Array(key);
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const current = sub.options.applicationServerKey;
      const same =
        current &&
        new Uint8Array(current).every((b, i) => b === appKey[i]) &&
        new Uint8Array(current).length === appKey.length;
      if (!same) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    }
    sub ??= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appKey as BufferSource,
    });
    await talkApi.pushSubscribe(sub.toJSON());
    return true;
  } catch {
    return false;
  }
}

export async function disablePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await talkApi.pushUnsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* nothing to unsubscribe */
  }
}

/** Keep the server's copy of this browser's subscription current. */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void enablePush();
  }, [enabled]);
}
