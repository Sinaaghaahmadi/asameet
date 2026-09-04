"use client";

/** Per-chat theme sheet: accent + wallpaper for one conversation only. */
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ACCENTS, WALLPAPERS, useTalkStore } from "@/stores/talk-store";
import { GBtn } from "./glass";
import { useTalk } from "./talk-data";
import { TalkPortal } from "./portal";

const PRESETS: {
  id: string;
  name: string;
  accent: string;
  wallpaper: (typeof WALLPAPERS)[number];
  from: string;
  to: string;
}[] = [
  {
    id: "sky",
    name: "آسمان",
    accent: "sky",
    wallpaper: "bubbles",
    from: "oklch(0.8 0.1 240)",
    to: "oklch(0.6 0.16 240)",
  },
  {
    id: "sunset",
    name: "غروب",
    accent: "orange",
    wallpaper: "gradient",
    from: "oklch(0.85 0.12 70)",
    to: "oklch(0.62 0.2 20)",
  },
  {
    id: "forest",
    name: "جنگل",
    accent: "green",
    wallpaper: "doodle",
    from: "oklch(0.82 0.12 150)",
    to: "oklch(0.55 0.15 160)",
  },
];

export function ChatThemeSheet({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const t = useT();
  const { saveSettings } = useTalk();
  const settings = useTalkStore((s) => s.settings);
  const current = settings.chatThemes?.[chatId];

  function apply(theme: { accent?: string; wallpaper?: string } | null) {
    const chatThemes = { ...(settings.chatThemes ?? {}) };
    if (theme) chatThemes[chatId] = theme;
    else delete chatThemes[chatId];
    void saveSettings({ chatThemes });
  }

  return (
    <TalkPortal>
      <div className="tg-sheet-backdrop" onClick={onClose} />
      <div className="tg-sheet tg-glass-strong !items-stretch !text-start">
        <span className="tg-sheet-handle self-center" />
        <h2 className="text-title font-black">{t("talk.conv.chatTheme")}</h2>
        <p className="tg-muted text-preview">{t("talk.conv.chatThemeHint")}</p>
        <div className="grid grid-cols-3 gap-2.5">
          {PRESETS.map((p) => {
            const active =
              current?.accent === p.accent &&
              current?.wallpaper === p.wallpaper;
            return (
              <button
                key={p.id}
                type="button"
                className="tg-theme-card relative overflow-hidden rounded-2xl p-2 text-start"
                data-active={active}
                style={{
                  background: `linear-gradient(160deg, ${p.from}, ${p.to})`,
                }}
                onClick={() =>
                  apply({ accent: p.accent, wallpaper: p.wallpaper })
                }
              >
                <span className="block h-16">
                  <span className="mt-2 block h-4 w-3/5 rounded-full bg-white/80" />
                  <span
                    className="ms-auto mt-1.5 block h-4 w-1/2 rounded-full"
                    style={{
                      background: `oklch(0.6 ${ACCENTS[p.accent].c} ${ACCENTS[p.accent].h})`,
                    }}
                  />
                </span>
                <span className="mt-1 block text-[12px] font-bold text-white drop-shadow">
                  {p.name}
                </span>
                {active && (
                  <span className="text-talk absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACCENTS).map(([id, a]) => (
            <button
              key={id}
              type="button"
              aria-label={a.name}
              className={cn(
                "size-8 rounded-full transition",
                current?.accent === id &&
                  "ring-talk ring-offset-talk-bg ring-2 ring-offset-2",
              )}
              style={{ background: `oklch(0.62 ${a.c} ${a.h})` }}
              onClick={() => apply({ ...current, accent: id })}
            />
          ))}
        </div>
        <GBtn variant="ghost" onClick={() => apply(null)}>
          {t("talk.conv.themeDefault")}
        </GBtn>
      </div>
    </TalkPortal>
  );
}
