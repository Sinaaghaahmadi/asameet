"use client";

import { create } from "zustand";
import { apiFetch } from "@/lib/client-api";
import type { User } from "@/lib/types";

export type AppView = "landing" | "app";
export type AppTab = "chats" | "calls" | "meetings" | "classes" | "admin";

interface AppState {
  view: AppView;
  tab: AppTab;
  /** Messenger-only mode for the standalone Android messenger app (?mode=messenger). */
  messengerOnly: boolean;
  currentUser: User | null;
  sidebarOpen: boolean;
  activeCallId: string | null;
  activeMeetingId: string | null;
  activeClassId: string | null;
  showLoginModal: boolean;
  unreadCounts: Record<string, number>;

  setView: (view: AppView) => void;
  setTab: (tab: AppTab) => void;
  setMessengerOnly: (v: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveCallId: (id: string | null) => void;
  setActiveMeetingId: (id: string | null) => void;
  setActiveClassId: (id: string | null) => void;
  setShowLoginModal: (show: boolean) => void;
  setUnreadCount: (tab: string, count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  tab: "chats",
  messengerOnly: false,
  currentUser: null,
  sidebarOpen: true,
  activeCallId: null,
  activeMeetingId: null,
  activeClassId: null,
  showLoginModal: false,
  unreadCounts: {},

  setView: (view) => set({ view }),
  setTab: (tab) => set({ tab }),
  setMessengerOnly: (messengerOnly) => set({ messengerOnly }),
  login: (user) => set({ currentUser: user, view: "app", showLoginModal: false }),
  logout: () => {
    // Revoke the server session; local state resets regardless of the outcome.
    void apiFetch("/api/auth", { method: "DELETE" }).catch(() => undefined);
    set({
      currentUser: null,
      view: "landing",
      tab: "chats",
      activeCallId: null,
      activeMeetingId: null,
      activeClassId: null,
    });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActiveCallId: (activeCallId) => set({ activeCallId }),
  setActiveMeetingId: (activeMeetingId) => set({ activeMeetingId }),
  setActiveClassId: (activeClassId) => set({ activeClassId }),
  setShowLoginModal: (showLoginModal) => set({ showLoginModal }),
  setUnreadCount: (tab, count) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [tab]: count } })),
}));

/**
 * Ask the server who the cookie session belongs to. The session cookie is
 * httpOnly, so the server is the only source of truth — nothing is trusted
 * from localStorage.
 */
export async function restoreSession(): Promise<User | null> {
  try {
    const res = await apiFetch("/api/auth");
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: User };
    return data.user ?? null;
  } catch {
    return null;
  }
}
