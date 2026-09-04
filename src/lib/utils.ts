import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatTime(date: string | Date, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeDay(
  date: string | Date,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const diffDays =
    Math.floor((startOfToday.getTime() - d.getTime()) / 86400000) + 1;
  if (d >= startOfToday) return formatTime(d, locale);
  if (diffDays <= 1) return yesterdayLabel;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale, {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function toLocaleDigits(value: number | string, locale: string): string {
  if (locale === "fa")
    return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  if (locale === "ar")
    return String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  return String(value);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}
