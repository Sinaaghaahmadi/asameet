"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ACCENTS, useTalkStore } from "@/stores/talk-store";
import { CallsPage } from "./calls/calls-page";
import { ChatInfo } from "./chat-info";
import { ChatList } from "./chat-list";
import { ChatView } from "./chat-view";
import { ContactsPanel, Lightbox, NewChatPanel } from "./dialogs";
import { GBtn, GEmpty } from "./glass";
import { Mascot } from "./mascots";
import { SettingsPanel } from "./settings/settings-panel";
import { useTalk } from "./talk-data";

export function TalkShell({ onLogout, onAddAccount, onSwitch }: { onLogout: (all?: boolean) => void; onAddAccount: () => void; onSwitch: (id: string) => void }) {
  const t = useT();
  const { chats } = useTalk();
  const { activeChatId, openChat, panel, setPanel, settings } = useTalkStore();
  const { setTheme } = useTheme();
  const chat = chats.find((c) => c.id === activeChatId) ?? null;

  // Apply saved theme once settings are known.
  useEffect(() => {
    if (settings.theme) setTheme(settings.theme);
  }, [settings.theme, setTheme]);

  // The chat may have been deleted or left.
  useEffect(() => {
    if (activeChatId && chats.length && !chat) openChat(null);
  }, [activeChatId, chats.length, chat, openChat]);

  // Escape closes panels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.kind !== "none") setPanel({ kind: "none" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel.kind, setPanel]);

  const accent = ACCENTS[settings.accent] ?? ACCENTS.sky;
  const sidePanel =
    panel.kind === "settings" ? (
      <SettingsPanel page={panel.page ?? "root"} onNavigate={(page) => setPanel({ kind: "settings", page })} onClose={() => setPanel({ kind: "none" })} onLogout={onLogout} onAddAccount={onAddAccount} onSwitch={onSwitch} />
    ) : panel.kind === "contacts" ? (
      <ContactsPanel onBack={() => setPanel({ kind: "none" })} />
    ) : panel.kind === "calls" ? (
      <CallsPage onBack={() => setPanel({ kind: "none" })} />
    ) : panel.kind === "newGroup" || panel.kind === "newChannel" ? (
      <NewChatPanel kind={panel.kind === "newGroup" ? "group" : "channel"} onBack={() => setPanel({ kind: "none" })} />
    ) : null;

  const infoPanel = panel.kind === "info" && chat ? <ChatInfo chat={chat} onClose={() => setPanel({ kind: "none" })} /> : null;

  return (
    <div
      className="talk flex h-dvh w-full overflow-hidden"
      data-anim={settings.animations ? "on" : "off"}
      style={{ ["--talk-h" as string]: accent.h, ["--talk-c" as string]: accent.c, ["--talk-radius" as string]: `${settings.bubbleRadius}px`, ["--talk-font-size" as string]: `${settings.fontSize}px` }}
    >
      {/* ---------- left column: chat list + side panels sliding over it ---------- */}
      <div className={cn("relative h-full w-full shrink-0 md:w-[360px] lg:w-[400px]", chat && !sidePanel && "hidden md:block")}>
        <ChatList onLogout={() => onLogout(false)} onAddAccount={onAddAccount} onSwitch={onSwitch} />
        <AnimatePresence>
          {sidePanel && (
            <motion.div
              key={panel.kind + ((panel.kind === "settings" && panel.page) || "")}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-20"
              style={{ background: "var(--talk-bg)" }}
            >
              {sidePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- mobile: info covers the chat ---------- */}
      {infoPanel && <div className="h-full w-full md:hidden" style={{ background: "var(--talk-bg)" }}>{infoPanel}</div>}

      {/* ---------- center ---------- */}
      <div className={cn("relative h-full min-w-0 flex-1", (sidePanel || infoPanel || !chat) && "hidden md:block")}>
        {chat ? (
          <ChatView chat={chat} onBack={() => openChat(null)} onOpenInfo={() => setPanel({ kind: "info" })} />
        ) : (
          <div className="tg-wall h-full" data-wall={settings.wallpaper}>
            <GEmpty
              mascot={<Mascot pose="wave" size={220} />}
              title={t("talk.chat.selectChat")}
              desc={t("talk.chat.selectChatDesc")}
              action={
                <GBtn variant="primary" onClick={() => setPanel({ kind: "contacts" })}>
                  {t("talk.menu.contacts")}
                </GBtn>
              }
            />
          </div>
        )}
      </div>

      {/* ---------- right column (desktop info) ---------- */}
      <AnimatePresence>
        {infoPanel && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="tg-panel hidden h-full shrink-0 overflow-hidden border-s tg-line md:block"
          >
            <div className="h-full w-[360px]">{infoPanel}</div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Lightbox />
    </div>
  );
}
