"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fa } from "./locales/fa";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { ar } from "./locales/ar";

export type Locale = "fa" | "en" | "fr" | "de" | "ar";
export type Dict = typeof fa;

export const RTL_LOCALES: Locale[] = ["fa", "ar"];

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const dictionaries: Record<Locale, Dict> = { fa, en, fr, de, ar };

const STORAGE_KEY = "asameet-locale";

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(
  dict: Record<string, unknown>,
  key: string,
): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (
      node &&
      typeof node === "object" &&
      part in (node as Record<string, unknown>)
    ) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fa");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && dictionaries[saved]) setLocaleState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const dir: "rtl" | "ltr" = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback(
    (key: string) =>
      resolve(
        dictionaries[locale] as unknown as Record<string, unknown>,
        key,
      ) ??
      resolve(fa as unknown as Record<string, unknown>, key) ??
      key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t }),
    [locale, dir, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  const { locale, dir, setLocale } = useI18n();
  return { locale, dir, setLocale };
}
