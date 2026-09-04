"use client";

/**
 * The navigation drawer. It lives at the root of the shell rather than inside
 * the chat-list panel so no panel can become its containing block or trap it
 * in a lower stacking context — the drawer always paints above the columns.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Bookmark,
  LogOut,
  Megaphone,
  Moon,
  Phone,
  Plus,
  Settings,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useTalkStore } from "@/stores/talk-store";
import { GSwitch, TalkAvatar } from "./glass";
import { AsatalkLogo, Mascot } from "./mascots";
import { useTalk } from "./talk-data";

export function TalkDrawer({
  onLogout,
  onAddAccount,
  onSwitch,
}: {
  onLogout: () => void;
  onAddAccount: () => void;
  onSwitch: (userId: string) => void;
}) {
  const t = useT();
  const { dir } = useLocale();
  const { me, openSaved, showError } = useTalk();
  const { setPanel, drawerOpen, setDrawer, accounts } = useTalkStore();
  const { resolvedTheme, setTheme } = useTheme();
  const asameetUrl = process.env.NEXT_PUBLIC_ASAMEET_URL;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-scrim fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <motion.aside
            initial={{ x: dir === "rtl" ? 320 : -320 }}
            animate={{ x: 0 }}
            exit={{ x: dir === "rtl" ? 320 : -320 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="tg-glass-strong z-drawer fixed inset-y-0 start-0 flex w-[310px] max-w-[86vw] flex-col"
            role="dialog"
          >
            {/* gradient head */}
            <div
              className="relative overflow-hidden px-5 pt-[52px] pb-4"
              style={{
                background:
                  "linear-gradient(135deg, var(--talk), var(--talk-strong))",
              }}
            >
              <div className="absolute -end-4 -top-6 opacity-25">
                <Mascot pose="wave" size={130} animate={false} />
              </div>
              <div className="relative flex items-end justify-between">
                <button
                  type="button"
                  className="rounded-full ring-[3px] ring-white/50"
                  onClick={() =>
                    setPanel({ kind: "settings", page: "profile" })
                  }
                  aria-label={t("talk.settings.profile")}
                >
                  <TalkAvatar
                    name={me.displayName}
                    src={me.avatar}
                    size="xl"
                    className="!size-16 !shadow-xl"
                  />
                </button>
                <div className="flex items-center gap-1.5">
                  {accounts
                    .filter((a) => !a.current)
                    .slice(0, 3)
                    .map((a) => (
                      <button
                        key={a.user.id}
                        type="button"
                        onClick={() => onSwitch(a.user.id)}
                        title={a.user.displayName}
                        className="rounded-full ring-2 ring-white/50 transition hover:scale-110"
                      >
                        <TalkAvatar
                          name={a.user.displayName}
                          src={a.user.avatar}
                          size="sm"
                          className="!size-[34px] !text-xs"
                        />
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={onAddAccount}
                    aria-label={t("talk.menu.addAccount")}
                    className="flex size-[34px] items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white transition hover:bg-white/15"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <p className="relative mt-3 truncate text-[17px] font-black text-white">
                {me.displayName}
              </p>
              <div className="flex flex-row-reverse justify-between">
                <p className="relative truncate text-[12px] text-white/85">
                  {me.username}@
                </p>
                <p
                  className="relative truncate text-[12px] text-white/85"
                  dir="ltr"
                >
                  {me.phone
                    ? ` · ${me.phone}`
                    : me.email
                      ? ` · ${me.email}`
                      : ""}
                </p>
              </div>
            </div>
            <div className="tg-scroll flex-1 p-2">
              <DrawerItem
                icon={<Users />}
                tint={240}
                label={t("talk.menu.newGroup")}
                onClick={() => setPanel({ kind: "newGroup" })}
              />
              <DrawerItem
                icon={<Megaphone />}
                tint={55}
                label={t("talk.menu.newChannel")}
                onClick={() => setPanel({ kind: "newChannel" })}
              />
              <DrawerItem
                icon={<UserPlus />}
                tint={295}
                label={t("talk.menu.contacts")}
                onClick={() => setPanel({ kind: "contacts" })}
              />
              <DrawerItem
                icon={<Phone />}
                tint={150}
                label={t("talk.menu.calls")}
                onClick={() => setPanel({ kind: "calls" })}
              />
              <DrawerItem
                icon={<Bookmark />}
                tint={200}
                label={t("talk.menu.savedMessages")}
                onClick={() =>
                  void openSaved()
                    .then(() => setDrawer(false))
                    .catch(showError)
                }
              />
              <DrawerItem
                icon={<Settings />}
                tint={270}
                label={t("talk.menu.settings")}
                onClick={() => setPanel({ kind: "settings", page: "root" })}
              />
              <div className="tg-row text-item font-medium">
                <span
                  className="tg-item-icon"
                  style={{ background: "oklch(0.55 0.15 280)" }}
                >
                  <Moon className="size-[18px]" />
                </span>
                <span className="flex-1">{t("talk.menu.nightMode")}</span>
                <GSwitch
                  on={resolvedTheme === "dark"}
                  onChange={(v) => setTheme(v ? "dark" : "light")}
                  label={t("talk.menu.nightMode")}
                />
              </div>
              <div className="bg-talk-line my-1.5 h-px" />
              {asameetUrl && (
                <a
                  href={asameetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tg-row text-item font-medium"
                >
                  <span
                    className="tg-item-icon"
                    style={{ background: "oklch(0.6 0.13 175)" }}
                  >
                    <Video className="size-[18px]" />
                  </span>
                  {t("talk.menu.asameet")}
                </a>
              )}
              <DrawerItem
                icon={<LogOut />}
                tint={20}
                label={t("talk.settings.logout")}
                onClick={onLogout}
                danger
              />
            </div>
            <div className="tg-line flex items-center gap-2 border-t px-4 py-3">
              <AsatalkLogo size={24} />
              <span className="tg-muted text-caption font-semibold">
                {t("talk.home.version")}
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerItem({
  icon,
  label,
  onClick,
  danger,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  tint: number;
}) {
  return (
    <button
      type="button"
      className={cn("tg-row text-item font-medium", danger && "text-red-500")}
      onClick={onClick}
    >
      <span
        className="tg-item-icon [&_svg]:size-[18px]"
        style={{
          background: danger ? "oklch(0.6 0.2 25)" : `oklch(0.6 0.15 ${tint})`,
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
