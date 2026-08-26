"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, LogOut, MessageSquare, Phone, Shield, Video } from "lucide-react";
import { AdminView } from "@/components/admin/admin-view";
import { CallsView } from "@/components/calls/calls-view";
import { ClassesView } from "@/components/meetings/classes-view";
import { MeetingsView } from "@/components/meetings/meetings-view";
import { MessengerView } from "@/components/messenger/messenger-view";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore, type AppTab } from "@/stores/app-store";

const NAV_ITEMS: { tab: AppTab; icon: typeof MessageSquare; labelKey: string; adminOnly?: boolean }[] = [
  { tab: "chats", icon: MessageSquare, labelKey: "nav.chats" },
  { tab: "calls", icon: Phone, labelKey: "nav.calls" },
  { tab: "meetings", icon: Video, labelKey: "nav.meetings" },
  { tab: "classes", icon: GraduationCap, labelKey: "nav.classes" },
  { tab: "admin", icon: Shield, labelKey: "nav.admin", adminOnly: true },
];

export function AppShell() {
  const t = useT();
  const { tab, setTab, currentUser, logout, messengerOnly, unreadCounts } = useAppStore();

  if (!currentUser) return null;

  const items = messengerOnly
    ? NAV_ITEMS.filter((i) => i.tab === "chats" || i.tab === "calls")
    : NAV_ITEMS.filter((i) => !i.adminOnly || currentUser.role === "admin");

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ============ Sidebar ============ */}
      <aside className="safe-area-top safe-area-bottom z-30 flex w-[68px] shrink-0 flex-col items-center gap-2 bg-gradient-to-b from-zinc-900 to-zinc-950 py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-1 cursor-default">
              <Avatar name={currentUser.displayName} size="md" online={true} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{currentUser.displayName}</TooltipContent>
        </Tooltip>
        <div className="mb-1 h-px w-9 bg-zinc-700/60" />

        <nav className="flex flex-1 flex-col items-center gap-2" aria-label={t("meta.name")}>
          {items.map((item) => {
            const active = tab === item.tab;
            const unread = unreadCounts[item.tab] ?? 0;
            return (
              <Tooltip key={item.tab}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTab(item.tab)}
                    aria-label={t(item.labelKey)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex size-12 items-center justify-center rounded-2xl transition-all duration-300 focus-glow cursor-pointer",
                      active
                        ? "scale-110 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/40"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <item.icon className="size-5" />
                    {unread > 0 && (
                      <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{t(item.labelKey)}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-1.5 [&_button]:text-zinc-400 [&_button:hover]:bg-zinc-800 [&_button:hover]:text-zinc-100">
          <ThemeToggle compact />
          <LanguageSwitcher />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="iconSm" onClick={logout} aria-label={t("common.logout")}>
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{t("common.logout")}</TooltipContent>
          </Tooltip>
          <Logo size={30} className="mt-1 opacity-80" />
        </div>
      </aside>

      {/* ============ Content ============ */}
      <main className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {tab === "chats" && <MessengerView />}
            {tab === "calls" && <CallsView />}
            {tab === "meetings" && <MeetingsView />}
            {tab === "classes" && <ClassesView />}
            {tab === "admin" && currentUser.role === "admin" && <AdminView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
