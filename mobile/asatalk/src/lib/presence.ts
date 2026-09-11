/**
 * Presence lease: renewed while the app is in the foreground, released the
 * moment it goes to the background, so "online" means "looking at the app".
 */
import { useEffect } from "react";
import { AppState } from "react-native";
import { talkApi } from "./api";

const RENEW_MS = 25_000;
export function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () => void talkApi.presence("online").catch(() => {});
    const start = () => { if (!timer) { beat(); timer = setInterval(beat, RENEW_MS); } };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") start();
      else { stop(); void talkApi.presence("offline").catch(() => {}); }
    });
    if (AppState.currentState === "active") start();
    return () => { sub.remove(); stop(); void talkApi.presence("offline").catch(() => {}); };
  }, [enabled]);
}
