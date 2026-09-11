import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TalkSettings } from "./api";
import type { User } from "./types";

export const DEFAULT_SETTINGS = {
  theme: "dark" as "light" | "dark" | "system", accent: "sky", fontSize: 15,
  notifSound: true, notifPreview: true, notifPrivate: true, notifGroups: true, notifChannels: true,
  inAppSounds: true, blocked: [] as string[],
};
export type Settings = typeof DEFAULT_SETTINGS & TalkSettings;

interface State {
  user: User | null;
  settings: Settings;
  drafts: Record<string, string>;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setSettings: (s: TalkSettings) => void;
  patchSettings: (s: TalkSettings) => void;
  setDraft: (chatId: string, text: string) => void;
}
export const useStore = create<State>()(
  persist(
    (set) => ({
      user: null, settings: { ...DEFAULT_SETTINGS }, drafts: {}, hydrated: false,
      setUser: (user) => set({ user }),
      setSettings: (s) => set({ settings: { ...DEFAULT_SETTINGS, ...s } as Settings }),
      patchSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } as Settings })),
      setDraft: (chatId, text) => set((st) => ({ drafts: { ...st.drafts, [chatId]: text } })),
    }),
    {
      name: "asatalk",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, settings: s.settings, drafts: s.drafts }),
      onRehydrateStorage: () => (st) => { if (st) st.hydrated = true; },
    },
  ),
);
