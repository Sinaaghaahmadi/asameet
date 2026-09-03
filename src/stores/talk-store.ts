"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TalkSettings } from "@/lib/talk/api";
import type { User } from "@/lib/types";

export type TalkPanel =
  | { kind: "none" }
  | { kind: "info" }
  | { kind: "settings"; page?: SettingsPage }
  | { kind: "contacts" }
  | { kind: "calls" }
  | { kind: "newGroup" }
  | { kind: "newChannel" }
  | { kind: "search" };

export type SettingsPage =
  | "root"
  | "profile"
  | "accounts"
  | "notifications"
  | "privacy"
  | "chat"
  | "folders"
  | "data"
  | "devices"
  | "language"
  | "password"
  | "about";

export const ACCENTS: Record<string, { name: string; h: number; c: number }> = {
  sky: { name: "Sky", h: 240, c: 0.16 },
  teal: { name: "Teal", h: 175, c: 0.13 },
  violet: { name: "Violet", h: 295, c: 0.18 },
  rose: { name: "Rose", h: 5, c: 0.19 },
  orange: { name: "Orange", h: 55, c: 0.17 },
  green: { name: "Green", h: 150, c: 0.16 },
  indigo: { name: "Indigo", h: 270, c: 0.17 },
};

export const WALLPAPERS = ["bubbles", "doodle", "gradient", "waves", "plain", "stars"] as const;
export type Wallpaper = (typeof WALLPAPERS)[number];

export const DEFAULT_SETTINGS: Required<
  Pick<
    TalkSettings,
    | "theme"
    | "accent"
    | "wallpaper"
    | "bubbleRadius"
    | "fontSize"
    | "animations"
    | "sendOnEnter"
    | "notifSound"
    | "notifPreview"
    | "notifPrivate"
    | "notifGroups"
    | "notifChannels"
    | "inAppSounds"
    | "lastSeen"
    | "profilePhoto"
    | "callsPrivacy"
    | "forwards"
    | "groupsPrivacy"
    | "blocked"
    | "autoDownloadPhotos"
    | "autoDownloadVideos"
    | "autoDownloadFiles"
    | "saveToGallery"
    | "folders"
  >
> = {
  theme: "system",
  accent: "sky",
  wallpaper: "bubbles",
  bubbleRadius: 16,
  fontSize: 15,
  animations: true,
  sendOnEnter: true,
  notifSound: true,
  notifPreview: true,
  notifPrivate: true,
  notifGroups: true,
  notifChannels: true,
  inAppSounds: true,
  lastSeen: "everybody",
  profilePhoto: "everybody",
  callsPrivacy: "everybody",
  forwards: "everybody",
  groupsPrivacy: "everybody",
  blocked: [],
  autoDownloadPhotos: true,
  autoDownloadVideos: true,
  autoDownloadFiles: false,
  saveToGallery: false,
  folders: [],
};

export type ResolvedSettings = typeof DEFAULT_SETTINGS & TalkSettings;

interface TalkState {
  user: User | null;
  settings: ResolvedSettings;
  accounts: { user: User; current: boolean }[];
  activeChatId: string | null;
  folder: string;
  panel: TalkPanel;
  drawerOpen: boolean;
  drafts: Record<string, string>;
  replyTo: string | null;
  editing: string | null;
  selected: string[];
  lightbox: { src: string; kind: "image" | "video"; caption?: string } | null;
  hydrated: boolean;

  setUser: (u: User | null) => void;
  setSettings: (s: TalkSettings) => void;
  patchSettings: (s: TalkSettings) => void;
  setAccounts: (a: { user: User; current: boolean }[]) => void;
  openChat: (id: string | null) => void;
  setFolder: (f: string) => void;
  setPanel: (p: TalkPanel) => void;
  setDrawer: (open: boolean) => void;
  setDraft: (chatId: string, text: string) => void;
  setReplyTo: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  setLightbox: (l: TalkState["lightbox"]) => void;
  setHydrated: (v: boolean) => void;
}

export const useTalkStore = create<TalkState>()(
  persist(
    (set) => ({
      user: null,
      settings: { ...DEFAULT_SETTINGS },
      accounts: [],
      activeChatId: null,
      folder: "all",
      panel: { kind: "none" },
      drawerOpen: false,
      drafts: {},
      replyTo: null,
      editing: null,
      selected: [],
      lightbox: null,
      hydrated: false,

      setUser: (user) => set({ user }),
      setSettings: (s) => set({ settings: { ...DEFAULT_SETTINGS, ...s } }),
      patchSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      setAccounts: (accounts) => set({ accounts }),
      openChat: (activeChatId) =>
        set((st) => ({
          activeChatId,
          replyTo: null,
          editing: null,
          selected: [],
          panel: activeChatId && st.panel.kind === "info" ? st.panel : st.panel.kind === "info" ? { kind: "none" } : st.panel,
          drawerOpen: false,
        })),
      setFolder: (folder) => set({ folder }),
      setPanel: (panel) => set({ panel, drawerOpen: false }),
      setDrawer: (drawerOpen) => set({ drawerOpen }),
      setDraft: (chatId, text) => set((st) => ({ drafts: { ...st.drafts, [chatId]: text } })),
      setReplyTo: (replyTo) => set({ replyTo, editing: null }),
      setEditing: (editing) => set({ editing, replyTo: null }),
      toggleSelected: (id) =>
        set((st) => ({ selected: st.selected.includes(id) ? st.selected.filter((x) => x !== id) : [...st.selected, id] })),
      clearSelected: () => set({ selected: [] }),
      setLightbox: (lightbox) => set({ lightbox }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "asatalk-ui",
      partialize: (s) => ({ settings: s.settings, folder: s.folder, drafts: s.drafts }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);
