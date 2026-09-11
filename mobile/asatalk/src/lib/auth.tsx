import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { talkApi, type TalkSettings } from "./api";
import { useStore } from "./store";
import type { User } from "./types";

interface Auth {
  user: User | null; ready: boolean;
  setSession: (u: User, s?: TalkSettings) => void;
  refresh: () => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
}
const Ctx = createContext<Auth | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error("useAuth outside AuthProvider"); return c; };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setSettings } = useStore();
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const { user: u, settings } = await talkApi.me();
      setUser(u); setSettings(settings);
    } catch (e) {
      if ((e as { status?: number }).status === 401) setUser(null);
    }
  }, [setUser, setSettings]);

  useEffect(() => { void refresh().finally(() => setReady(true)); }, [refresh]);

  const setSession = useCallback((u: User, s?: TalkSettings) => { setUser(u); if (s) setSettings(s); }, [setUser, setSettings]);
  const logout = useCallback(async (all = false) => {
    const res = await (all ? talkApi.logoutAll() : talkApi.logoutCurrent()).catch(() => ({ user: null }));
    qc.clear();
    setUser(res.user ?? null);
    if (res.user) await refresh();
  }, [qc, setUser, refresh]);

  const value = useMemo(() => ({ user, ready, setSession, refresh, logout }), [user, ready, setSession, refresh, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
