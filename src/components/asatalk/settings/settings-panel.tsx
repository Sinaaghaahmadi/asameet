"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  AtSign,
  Bell,
  Check,
  ChevronDown,
  Database,
  FileText,
  Folder,
  Globe,
  Info,
  KeyRound,
  Languages,
  Laptop,
  LogOut,
  Lock,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  User,
  UserPlus,
  X,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { talkApi, type TalkSettings } from "@/lib/talk/api";
import { chatDisplayName, deviceLabel } from "@/lib/talk/format";
import { LOCALES, useLocale, useT } from "@/lib/i18n";
import { cn, formatRelativeDay, toLocaleDigits } from "@/lib/utils";
import {
  ACCENTS,
  WALLPAPERS,
  useTalkStore,
  type SettingsPage,
} from "@/stores/talk-store";
import { AvatarPicker, ConfirmDialog } from "../dialogs";
import { GBtn, GHeader, GItem, GSection, GSwitch, TalkAvatar } from "../glass";
import { AsatalkLogo, Mascot } from "../mascots";
import { PinScreen } from "../pin-lock";
import { useTalk } from "../talk-data";

export function SettingsPanel({
  page,
  onNavigate,
  onClose,
  onLogout,
  onAddAccount,
  onSwitch,
}: {
  page: SettingsPage;
  onNavigate: (p: SettingsPage) => void;
  onClose: () => void;
  onLogout: (all?: boolean) => void;
  onAddAccount: () => void;
  onSwitch: (id: string) => void;
}) {
  const t = useT();
  const back = page === "root" ? onClose : () => onNavigate("root");
  return (
    <div className="flex h-full flex-col">
      {page === "root" && (
        <Root onNavigate={onNavigate} onClose={onClose} onLogout={onLogout} />
      )}
      {page === "profile" && <ProfilePage back={back} />}
      {page === "accounts" && (
        <AccountsPage
          back={back}
          onAddAccount={onAddAccount}
          onSwitch={onSwitch}
          onLogout={onLogout}
        />
      )}
      {page === "notifications" && <NotificationsPage back={back} />}
      {page === "privacy" && (
        <PrivacyPage back={back} onNavigate={onNavigate} />
      )}
      {page === "chat" && <ChatSettingsPage back={back} />}
      {page === "folders" && <FoldersPage back={back} />}
      {page === "data" && <DataPage back={back} />}
      {page === "devices" && <DevicesPage back={back} />}
      {page === "language" && <LanguagePage back={back} />}
      {page === "password" && <PasswordPage back={back} />}
      {page === "about" && <AboutPage back={back} />}
      <span className="sr-only">{t("talk.settings.title")}</span>
    </div>
  );
}

const C = {
  blue: "linear-gradient(135deg,#3b82f6,#2563eb)",
  green: "linear-gradient(135deg,#10b981,#059669)",
  red: "linear-gradient(135deg,#ef4444,#dc2626)",
  orange: "linear-gradient(135deg,#f97316,#ea580c)",
  purple: "linear-gradient(135deg,#a855f7,#7c3aed)",
  pink: "linear-gradient(135deg,#ec4899,#db2777)",
  teal: "linear-gradient(135deg,#14b8a6,#0d9488)",
  gray: "linear-gradient(135deg,#64748b,#475569)",
  amber: "linear-gradient(135deg,#f59e0b,#d97706)",
  sky: "linear-gradient(135deg,#0ea5e9,#0284c7)",
};

function Root({
  onNavigate,
  onClose,
  onLogout,
}: {
  onNavigate: (p: SettingsPage) => void;
  onClose: () => void;
  onLogout: (all?: boolean) => void;
}) {
  const t = useT();
  const { me } = useTalk();
  const { locale } = useLocale();
  const [confirm, setConfirm] = useState(false);
  const folderCount = useTalkStore((st) => st.settings.folders?.length ?? 0);
  const sessionsQ = useQuery({
    queryKey: ["talk", "sessions"],
    queryFn: () => talkApi.sessions(),
    staleTime: 60_000,
  });
  const sessionCount = sessionsQ.data?.sessions.length ?? 0;
  return (
    <>
      <GHeader
        title={t("talk.settings.title")}
        onBack={onClose}
        right={
          <GBtn
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("profile")}
            aria-label={t("talk.settings.editProfile")}
          >
            <Pencil className="size-5" />
          </GBtn>
        }
      />
      <div className="tg-scroll flex-1 pb-6">
        <button
          type="button"
          className="flex w-full items-center gap-4 px-5 py-5 text-start"
          onClick={() => onNavigate("profile")}
        >
          <TalkAvatar
            name={me.displayName}
            src={me.avatar}
            size="xl"
            className="!size-[70px]"
          />
          <span className="min-w-0 flex-1">
            <span className="text-title block truncate font-black">
              {me.displayName}
            </span>
            <span className="tg-muted text-body block truncate" dir="ltr">
              {me.username}@
              {me.phone ? ` · ${me.phone}` : me.email ? ` · ${me.email}` : ""}
            </span>
            {me.bio && (
              <span className="tg-muted mt-0.5 block truncate text-xs">
                {me.bio}
              </span>
            )}
          </span>
          <Pencil className="text-talk size-4 shrink-0" />
        </button>
        <div className="px-3">
          <GSection title={t("talk.settings.account")}>
            <GItem
              icon={<User className="size-4" />}
              color={C.blue}
              label={t("talk.settings.editProfile")}
              onClick={() => onNavigate("profile")}
              chevron
            />
            <GItem
              icon={<UserPlus className="size-4" />}
              color={C.teal}
              label={t("talk.settings.accounts")}
              onClick={() => onNavigate("accounts")}
              chevron
            />
          </GSection>
          <GSection title={t("talk.settings.general")}>
            <GItem
              icon={<Bell className="size-4" />}
              color={C.red}
              label={t("talk.settings.notifications")}
              onClick={() => onNavigate("notifications")}
              chevron
            />
            <GItem
              icon={<Lock className="size-4" />}
              color={C.gray}
              label={t("talk.settings.privacy")}
              onClick={() => onNavigate("privacy")}
              chevron
            />
            <GItem
              icon={<MessageCircle className="size-4" />}
              color={C.blue}
              label={t("talk.settings.chatSettings")}
              onClick={() => onNavigate("chat")}
              chevron
            />
            <GItem
              icon={<Folder className="size-4" />}
              color={C.amber}
              label={t("talk.settings.folders")}
              value={
                folderCount ? toLocaleDigits(folderCount, locale) : undefined
              }
              onClick={() => onNavigate("folders")}
              chevron
            />
            <GItem
              icon={<Database className="size-4" />}
              color={C.green}
              label={t("talk.settings.dataStorage")}
              onClick={() => onNavigate("data")}
              chevron
            />
            <GItem
              icon={<Laptop className="size-4" />}
              color={C.purple}
              label={t("talk.settings.devices")}
              value={
                sessionCount ? toLocaleDigits(sessionCount, locale) : undefined
              }
              onClick={() => onNavigate("devices")}
              chevron
            />
            <GItem
              icon={<Languages className="size-4" />}
              color={C.sky}
              label={t("talk.settings.language")}
              value={LOCALES.find((l) => l.code === locale)?.label}
              onClick={() => onNavigate("language")}
              chevron
            />
          </GSection>
          <GSection>
            <GItem
              icon={<Info className="size-4" />}
              color={C.blue}
              label={t("talk.settings.about")}
              onClick={() => onNavigate("about")}
              chevron
            />
            <GItem
              icon={<HelpCircle className="size-4" />}
              color={C.teal}
              label={t("talk.settings.help")}
              onClick={() =>
                window.open(
                  `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/faq`,
                  "_blank",
                )
              }
              chevron
            />
          </GSection>
          <GSection>
            <GItem
              icon={<LogOut className="size-4" />}
              color={C.red}
              label={t("talk.settings.logout")}
              danger
              onClick={() => setConfirm(true)}
            />
          </GSection>
          <div className="flex flex-col items-center gap-1 py-4">
            <Mascot pose="love" size={110} />
            <p className="tg-muted text-caption text-center">
              {t("talk.name")} ۲.۴.۰ — {t("talk.settings.abt.madeBy")}
            </p>
          </div>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={t("talk.settings.logoutConfirm")}
          danger
          confirmLabel={t("talk.settings.logout")}
          onCancel={() => setConfirm(false)}
          onConfirm={() => onLogout(false)}
        />
      )}
    </>
  );
}

function ProfilePage({ back }: { back: () => void }) {
  const t = useT();
  const { me, showError } = useTalk();
  const setUser = useTalkStore((s) => s.setUser);
  const [name, setName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(me.avatar);
  const [busy, setBusy] = useState(false);
  const dirty =
    name !== me.displayName ||
    username !== me.username ||
    bio !== (me.bio ?? "") ||
    avatar !== me.avatar;

  async function save() {
    setBusy(true);
    try {
      const { user } = await talkApi.updateProfile({
        displayName: name !== me.displayName ? name : undefined,
        username: username !== me.username ? username : undefined,
        bio: bio !== (me.bio ?? "") ? bio : undefined,
        avatar: avatar && avatar !== me.avatar ? avatar : undefined,
        clearAvatar: !avatar && !!me.avatar,
      });
      setUser(user);
      toast.success(t("talk.settings.saved"));
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GHeader
        title={t("talk.settings.editProfile")}
        onBack={back}
        right={
          <GBtn
            variant="primary"
            size="sm"
            disabled={!dirty || busy || !name.trim()}
            onClick={() => void save()}
          >
            <Check className="size-4" /> {t("talk.settings.save")}
          </GBtn>
        }
      />
      <div className="tg-scroll flex-1 px-3 pb-6">
        <div className="flex flex-col items-center gap-3 py-6">
          <AvatarPicker
            value={avatar}
            onChange={setAvatar}
            name={name}
            size="xxl"
          />
          {avatar && (
            <button
              type="button"
              className="text-xs text-red-500"
              onClick={() => setAvatar(null)}
            >
              {t("talk.settings.removePhoto")}
            </button>
          )}
        </div>
        <GSection hint={t("talk.settings.usernameHint")}>
          <div className="px-3 py-2">
            <label className="tg-muted text-caption">
              {t("talk.settings.name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tg-input mt-1"
              maxLength={64}
            />
          </div>
          <div className="px-3 py-2">
            <label className="tg-muted text-caption">
              {t("talk.settings.username")}
            </label>
            <div className="relative mt-1">
              <AtSign className="tg-muted absolute start-3 top-1/2 size-4 -translate-y-1/2" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="tg-input ps-9"
                dir="ltr"
                maxLength={32}
              />
            </div>
          </div>
        </GSection>
        <GSection hint={t("talk.settings.bioHint")}>
          <div className="px-3 py-2">
            <label className="tg-muted text-caption">
              {t("talk.settings.bio")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 140))}
              className="tg-input mt-1 min-h-20"
              maxLength={140}
            />
            <p className="tg-muted text-meta mt-1 text-end">
              {140 - bio.length}
            </p>
          </div>
        </GSection>
      </div>
    </>
  );
}

function AccountsPage({
  back,
  onAddAccount,
  onSwitch,
  onLogout,
}: {
  back: () => void;
  onAddAccount: () => void;
  onSwitch: (id: string) => void;
  onLogout: (all?: boolean) => void;
}) {
  const t = useT();
  const { accounts } = useTalkStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <GHeader title={t("talk.settings.accounts")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection>
          {accounts.map((a) => (
            <GItem
              key={a.user.id}
              icon={
                <TalkAvatar
                  name={a.user.displayName}
                  src={a.user.avatar}
                  size="xs"
                />
              }
              color="transparent"
              label={a.user.displayName}
              value={
                a.current ? (
                  <Check className="text-talk size-4" />
                ) : (
                  `@${a.user.username}`
                )
              }
              onClick={a.current ? undefined : () => onSwitch(a.user.id)}
            />
          ))}
          {accounts.length < 5 && (
            <GItem
              icon={<Plus className="size-4" />}
              label={t("talk.settings.addAccount")}
              onClick={onAddAccount}
            />
          )}
        </GSection>
        <GSection>
          <GItem
            icon={<LogOut className="size-4" />}
            color={C.red}
            label={t("talk.settings.logoutAll")}
            danger
            onClick={() => setConfirm(true)}
          />
        </GSection>
        <div className="flex justify-center">
          <Mascot pose="group" size={150} />
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={t("talk.settings.logoutAll")}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => onLogout(true)}
        />
      )}
    </>
  );
}

function useSetting() {
  const { settings } = useTalkStore();
  const { saveSettings } = useTalk();
  return { s: settings, set: (p: TalkSettings) => void saveSettings(p) };
}

function NotificationsPage({ back }: { back: () => void }) {
  const t = useT();
  const { s, set } = useSetting();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  useEffect(
    () =>
      setPerm(
        typeof Notification === "undefined"
          ? "unsupported"
          : Notification.permission,
      ),
    [],
  );
  return (
    <>
      <GHeader title={t("talk.settings.notifications")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection
          title={t("talk.settings.notif.section")}
          hint={t("talk.settings.notif.desc")}
        >
          <GItem
            icon={<User className="size-4" />}
            color={C.blue}
            label={t("talk.settings.notif.private")}
            right={
              <GSwitch
                on={s.notifPrivate}
                onChange={(v) => set({ notifPrivate: v })}
              />
            }
          />
          <GItem
            icon={<MessageCircle className="size-4" />}
            color={C.green}
            label={t("talk.settings.notif.groups")}
            right={
              <GSwitch
                on={s.notifGroups}
                onChange={(v) => set({ notifGroups: v })}
              />
            }
          />
          <GItem
            icon={<Bell className="size-4" />}
            color={C.orange}
            label={t("talk.settings.notif.channels")}
            right={
              <GSwitch
                on={s.notifChannels}
                onChange={(v) => set({ notifChannels: v })}
              />
            }
          />
        </GSection>
        <GSection>
          <GItem
            icon={<Bell className="size-4" />}
            color={C.red}
            label={t("talk.settings.notif.sound")}
            right={
              <GSwitch
                on={s.notifSound}
                onChange={(v) => set({ notifSound: v })}
              />
            }
          />
          <GItem
            icon={<FileText className="size-4" />}
            color={C.purple}
            label={t("talk.settings.notif.preview")}
            right={
              <GSwitch
                on={s.notifPreview}
                onChange={(v) => set({ notifPreview: v })}
              />
            }
          />
          <GItem
            icon={<Smartphone className="size-4" />}
            color={C.teal}
            label={t("talk.settings.notif.inApp")}
            right={
              <GSwitch
                on={s.inAppSounds}
                onChange={(v) => set({ inAppSounds: v })}
              />
            }
          />
        </GSection>
        <GSection
          title={t("talk.settings.notif.browser")}
          hint={t("talk.settings.notif.browserHint")}
        >
          <GItem
            icon={<Monitor className="size-4" />}
            color={C.gray}
            label={
              perm === "granted"
                ? t("talk.settings.notif.allowed")
                : perm === "denied"
                  ? t("talk.settings.notif.denied")
                  : t("talk.settings.notif.allow")
            }
            onClick={
              perm === "default"
                ? () => void Notification.requestPermission().then(setPerm)
                : undefined
            }
            chevron={perm === "default"}
          />
        </GSection>
      </div>
    </>
  );
}

function Choice({
  value,
  onChange,
}: {
  value: "everybody" | "contacts" | "nobody";
  onChange: (v: "everybody" | "contacts" | "nobody") => void;
}) {
  const t = useT();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "everybody")}
        className="tg-input h-9 appearance-none py-0 pe-8 text-xs"
      >
        {(["everybody", "contacts", "nobody"] as const).map((k) => (
          <option key={k} value={k}>
            {t(`talk.settings.priv.${k}`)}
          </option>
        ))}
      </select>
      <ChevronDown className="tg-muted pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2" />
    </div>
  );
}

function PrivacyPage({
  back,
  onNavigate,
}: {
  back: () => void;
  onNavigate: (p: SettingsPage) => void;
}) {
  const t = useT();
  const { s, set } = useSetting();
  const { users, toggleBlock } = useTalk();
  const blocked = (s.blocked ?? []).map((id) => users.get(id)).filter(Boolean);
  const [pinSetup, setPinSetup] = useState(false);
  return (
    <>
      {pinSetup && (
        <PinScreen
          mode="set"
          onDone={(pin) => {
            set({ pinLock: pin });
            setPinSetup(false);
            toast.success(t("talk.pin.set"));
          }}
          onCancel={() => setPinSetup(false)}
        />
      )}
      <GHeader title={t("talk.settings.privacy")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection
          title={t("talk.settings.priv.section")}
          hint={t("talk.settings.priv.whoCan")}
        >
          <GItem
            icon={<User className="size-4" />}
            color={C.blue}
            label={t("talk.settings.priv.lastSeen")}
            right={
              <Choice
                value={s.lastSeen}
                onChange={(v) => set({ lastSeen: v })}
              />
            }
          />
          <GItem
            icon={<Palette className="size-4" />}
            color={C.pink}
            label={t("talk.settings.priv.profilePhoto")}
            right={
              <Choice
                value={s.profilePhoto}
                onChange={(v) => set({ profilePhoto: v })}
              />
            }
          />
          <GItem
            icon={<Smartphone className="size-4" />}
            color={C.green}
            label={t("talk.settings.priv.calls")}
            right={
              <Choice
                value={s.callsPrivacy}
                onChange={(v) => set({ callsPrivacy: v })}
              />
            }
          />
          <GItem
            icon={<MessageCircle className="size-4" />}
            color={C.orange}
            label={t("talk.settings.priv.forwards")}
            right={
              <Choice
                value={s.forwards}
                onChange={(v) => set({ forwards: v })}
              />
            }
          />
          <GItem
            icon={<UserPlus className="size-4" />}
            color={C.purple}
            label={t("talk.settings.priv.groups")}
            right={
              <Choice
                value={s.groupsPrivacy}
                onChange={(v) => set({ groupsPrivacy: v })}
              />
            }
          />
        </GSection>
        <GSection title={t("talk.settings.priv.blocked")}>
          {blocked.length === 0 && (
            <p className="tg-muted px-4 py-3 text-xs">
              {t("talk.settings.priv.blockedEmpty")}
            </p>
          )}
          {blocked.map((u) => (
            <GItem
              key={u!.id}
              icon={
                <TalkAvatar name={u!.displayName} src={u!.avatar} size="xs" />
              }
              color="transparent"
              label={u!.displayName}
              right={
                <GBtn size="sm" onClick={() => void toggleBlock(u!.id)}>
                  {t("talk.settings.priv.unblock")}
                </GBtn>
              }
            />
          ))}
        </GSection>
        <GSection title={t("talk.settings.priv.security")}>
          <GItem
            icon={<Lock className="size-4" />}
            color={C.blue}
            label={t("talk.pin.enable")}
            value={s.pinLock ? "●●●●●●" : undefined}
            right={
              <GSwitch
                on={!!s.pinLock}
                onChange={(v) =>
                  v
                    ? setPinSetup(true)
                    : (set({ pinLock: "" }),
                      toast.success(t("talk.pin.removed")))
                }
              />
            }
          />
          <GItem
            icon={<KeyRound className="size-4" />}
            color={C.amber}
            label={t("talk.settings.priv.changePassword")}
            onClick={() => onNavigate("password")}
            chevron
          />
          <GItem
            icon={<Laptop className="size-4" />}
            color={C.gray}
            label={t("talk.settings.priv.activeSessions")}
            onClick={() => onNavigate("devices")}
            chevron
          />
        </GSection>
        <div className="flex justify-center">
          <Mascot pose="lock" size={140} />
        </div>
      </div>
    </>
  );
}

function ChatSettingsPage({ back }: { back: () => void }) {
  const t = useT();
  const { s, set } = useSetting();
  const { setTheme } = useTheme();
  return (
    <>
      <GHeader title={t("talk.settings.chatSettings")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        {/* live preview */}
        <div
          className="tg-wall tg-line mb-4 overflow-hidden rounded-2xl border p-3"
          data-wall={s.wallpaper}
        >
          <div className="flex flex-col gap-2">
            <div className="flex">
              <div
                className="tg-bubble tg-bubble-in tg-tail"
                style={{ borderRadius: s.bubbleRadius }}
              >
                {t("talk.settings.chat.previewIn")}
                <span className="tg-meta">10:24</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="tg-bubble tg-bubble-out tg-tail"
                style={{ borderRadius: s.bubbleRadius }}
              >
                {t("talk.settings.chat.previewOut")}
                <span className="tg-meta">10:25 ✓✓</span>
              </div>
            </div>
          </div>
        </div>

        <GSection title={t("talk.settings.chat.theme")}>
          <div className="tg-seg m-3">
            {(["light", "dark", "system"] as const).map((k) => (
              <button
                key={k}
                type="button"
                data-active={s.theme === k}
                onClick={() => {
                  set({ theme: k });
                  setTheme(k);
                }}
              >
                {k === "light" ? (
                  <Sun className="size-4" />
                ) : k === "dark" ? (
                  <Moon className="size-4" />
                ) : (
                  <Monitor className="size-4" />
                )}
                {t(`talk.settings.chat.${k}`)}
              </button>
            ))}
          </div>
        </GSection>

        <GSection title={t("talk.settings.chat.accent")}>
          <div className="flex flex-wrap justify-between gap-2 px-4 py-4">
            {Object.entries(ACCENTS).map(([k, a]) => (
              <button
                key={k}
                type="button"
                aria-label={a.name}
                title={a.name}
                onClick={() => set({ accent: k })}
                className={cn(
                  "ring-offset-talk-surface size-9 rounded-full ring-offset-2 transition hover:scale-110",
                  s.accent === k && "ring-talk ring-2",
                )}
                style={{
                  background: `oklch(0.62 ${a.c} ${a.h})`,
                  boxShadow: `0 6px 14px oklch(0.6 ${a.c} ${a.h} / 0.35)`,
                }}
              >
                {s.accent === k && (
                  <Check
                    className="mx-auto size-4 text-white"
                    strokeWidth={3}
                  />
                )}
              </button>
            ))}
          </div>
        </GSection>

        <GSection title={t("talk.settings.chat.wallpaper")}>
          <div className="grid grid-cols-6 gap-2 p-3">
            {WALLPAPERS.map((w) => (
              <button
                key={w}
                type="button"
                className={cn(
                  "tg-wall relative aspect-square overflow-hidden rounded-xl border-2 transition",
                  s.wallpaper === w ? "border-talk" : "border-transparent",
                )}
                data-wall={w}
                onClick={() => set({ wallpaper: w })}
                aria-label={w}
              >
                {s.wallpaper === w && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-talk flex size-5 items-center justify-center rounded-full text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </GSection>

        <GSection>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span>{t("talk.settings.chat.fontSize")}</span>
              <span className="tg-muted text-xs">{s.fontSize}px</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[12px]">A</span>
              <input
                type="range"
                min={12}
                max={20}
                value={s.fontSize}
                onChange={(e) => set({ fontSize: Number(e.target.value) })}
                className="tg-range flex-1"
                style={{
                  ["--p" as string]: `${((s.fontSize - 12) / 8) * 100}%`,
                }}
              />
              <span className="text-[20px] font-bold">A</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span>{t("talk.settings.chat.bubbleRadius")}</span>
              <span className="tg-muted text-xs">{s.bubbleRadius}px</span>
            </div>
            <input
              type="range"
              min={6}
              max={24}
              value={s.bubbleRadius}
              onChange={(e) => set({ bubbleRadius: Number(e.target.value) })}
              className="tg-range mt-2 w-full"
              style={{
                ["--p" as string]: `${((s.bubbleRadius - 6) / 18) * 100}%`,
              }}
            />
          </div>
        </GSection>

        <GSection hint={t("talk.settings.chat.sendOnEnterHint")}>
          <GItem
            icon={<Palette className="size-4" />}
            color={C.purple}
            label={t("talk.settings.chat.animations")}
            right={
              <GSwitch
                on={s.animations}
                onChange={(v) => set({ animations: v })}
              />
            }
          />
          <GItem
            icon={<MessageCircle className="size-4" />}
            color={C.blue}
            label={t("talk.settings.chat.sendOnEnter")}
            right={
              <GSwitch
                on={s.sendOnEnter}
                onChange={(v) => set({ sendOnEnter: v })}
              />
            }
          />
        </GSection>
      </div>
    </>
  );
}

function FoldersPage({ back }: { back: () => void }) {
  const t = useT();
  const { s, set } = useSetting();
  const { chats, users, me } = useTalk();
  const [edit, setEdit] = useState<{
    id: string;
    name: string;
    emoji: string;
    chatIds: string[];
  } | null>(null);
  const folders = s.folders ?? [];
  return (
    <>
      <GHeader title={t("talk.settings.folders")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <div className="tg-glass mb-4 flex items-center gap-3 rounded-2xl p-3">
          <Mascot pose="think" size={80} animate={false} />
          <p className="tg-muted text-xs leading-5">
            {t("talk.settings.fold.desc")}
          </p>
        </div>
        <GSection>
          {folders.length === 0 && (
            <p className="tg-muted px-4 py-3 text-xs">
              {t("talk.settings.fold.empty")}
            </p>
          )}
          {folders.map((f) => (
            <GItem
              key={f.id}
              icon={<span>{f.emoji}</span>}
              color={C.purple}
              label={f.name}
              value={`${f.chatIds.length}`}
              onClick={() => setEdit({ ...f })}
              chevron
            />
          ))}
          <GItem
            icon={<Plus className="size-4" />}
            label={t("talk.settings.fold.add")}
            onClick={() =>
              setEdit({
                id: Math.random().toString(36).slice(2, 8),
                name: "",
                emoji: "📁",
                chatIds: [],
              })
            }
          />
        </GSection>
        {edit && (
          <div className="tg-section p-3">
            <p className="mb-2 text-sm font-bold">
              {folders.some((f) => f.id === edit.id)
                ? t("talk.settings.fold.edit")
                : t("talk.settings.fold.add")}
            </p>
            <div className="flex gap-2">
              <input
                value={edit.emoji}
                onChange={(e) =>
                  setEdit({ ...edit, emoji: e.target.value.slice(-2) })
                }
                className="tg-input w-16 text-center"
                aria-label={t("talk.settings.fold.emoji")}
              />
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder={t("talk.settings.fold.name")}
                className="tg-input"
                maxLength={24}
              />
            </div>
            <p className="tg-section-title !px-0">
              {t("talk.settings.fold.includeChats")}
            </p>
            <div className="tg-scroll max-h-56">
              {chats.map((c) => {
                const on = edit.chatIds.includes(c.id);
                const title = chatDisplayName(c, users, me.id, t);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="tg-row"
                    onClick={() =>
                      setEdit({
                        ...edit,
                        chatIds: on
                          ? edit.chatIds.filter((x) => x !== c.id)
                          : [...edit.chatIds, c.id],
                      })
                    }
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        on
                          ? "border-talk bg-talk text-white"
                          : "border-talk-line",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <TalkAvatar
                      name={title}
                      src={c.avatar}
                      size="xs"
                      seed={c.id}
                    />
                    <span className="truncate text-sm">{title}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              {folders.some((f) => f.id === edit.id) && (
                <GBtn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set({ folders: folders.filter((f) => f.id !== edit.id) });
                    setEdit(null);
                  }}
                >
                  <Trash2 className="size-4 text-red-500" />{" "}
                  {t("talk.settings.fold.delete")}
                </GBtn>
              )}
              <GBtn variant="ghost" size="sm" onClick={() => setEdit(null)}>
                <X className="size-4" /> {t("common.cancel")}
              </GBtn>
              <GBtn
                variant="primary"
                size="sm"
                disabled={!edit.name.trim()}
                onClick={() => {
                  set({
                    folders: [...folders.filter((f) => f.id !== edit.id), edit],
                  });
                  setEdit(null);
                }}
              >
                <Check className="size-4" /> {t("talk.settings.fold.save")}
              </GBtn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DataPage({ back }: { back: () => void }) {
  const t = useT();
  const { s, set } = useSetting();
  const qc = useQueryClient();
  return (
    <>
      <GHeader title={t("talk.settings.dataStorage")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection
          title={t("talk.settings.data.autoDownload")}
          hint={t("talk.settings.data.hint")}
        >
          <GItem
            icon={<Palette className="size-4" />}
            color={C.blue}
            label={t("talk.settings.data.photos")}
            right={
              <GSwitch
                on={s.autoDownloadPhotos}
                onChange={(v) => set({ autoDownloadPhotos: v })}
              />
            }
          />
          <GItem
            icon={<Monitor className="size-4" />}
            color={C.purple}
            label={t("talk.settings.data.videos")}
            right={
              <GSwitch
                on={s.autoDownloadVideos}
                onChange={(v) => set({ autoDownloadVideos: v })}
              />
            }
          />
          <GItem
            icon={<FileText className="size-4" />}
            color={C.orange}
            label={t("talk.settings.data.files")}
            right={
              <GSwitch
                on={s.autoDownloadFiles}
                onChange={(v) => set({ autoDownloadFiles: v })}
              />
            }
          />
          <GItem
            icon={<Database className="size-4" />}
            color={C.green}
            label={t("talk.settings.data.saveToGallery")}
            right={
              <GSwitch
                on={s.saveToGallery}
                onChange={(v) => set({ saveToGallery: v })}
              />
            }
          />
        </GSection>
        <GSection title={t("talk.settings.data.storageUsage")}>
          <GItem
            icon={<Trash2 className="size-4" />}
            color={C.red}
            label={t("talk.settings.data.clearCache")}
            onClick={async () => {
              qc.clear();
              if ("caches" in window)
                for (const k of await caches.keys()) await caches.delete(k);
              toast.success(t("talk.settings.data.cacheCleared"));
            }}
          />
        </GSection>
      </div>
    </>
  );
}

function DevicesPage({ back }: { back: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { showError } = useTalk();
  const q = useQuery({
    queryKey: ["talk", "sessions"],
    queryFn: () => talkApi.sessions(),
  });
  const sessions = q.data?.sessions ?? [];
  const current = sessions.find((s) => s.current);
  const others = sessions.filter((s) => !s.current);
  async function kill(id?: string) {
    try {
      await talkApi.terminateSession(id);
      toast.success(t("talk.settings.dev.terminated"));
      await q.refetch();
    } catch (e) {
      showError(e);
    }
  }
  return (
    <>
      <GHeader title={t("talk.settings.devices")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        {current && (
          <GSection title={t("talk.settings.dev.current")}>
            <GItem
              icon={<Laptop className="size-4" />}
              color={C.green}
              label={deviceLabel(current.userAgent)}
              value={t("talk.settings.dev.current")}
            />
          </GSection>
        )}
        <GSection
          title={t("talk.settings.dev.active")}
          hint={t("talk.settings.dev.desc")}
        >
          {others.length === 0 && (
            <p className="tg-muted px-4 py-3 text-xs">—</p>
          )}
          {others.map((s) => (
            <GItem
              key={s.id}
              icon={<Smartphone className="size-4" />}
              color={C.gray}
              label={deviceLabel(s.userAgent)}
              value={`${t("talk.settings.dev.lastActive")} ${formatRelativeDay(s.lastUsedAt, locale, t("common.today"), t("common.yesterday"))}`}
              right={
                <GBtn size="sm" variant="ghost" onClick={() => void kill(s.id)}>
                  <X className="size-4 text-red-500" />
                </GBtn>
              }
            />
          ))}
          {others.length > 0 && (
            <GItem
              icon={<Shield className="size-4" />}
              color={C.red}
              label={t("talk.settings.dev.terminateAll")}
              danger
              onClick={() => void kill()}
            />
          )}
        </GSection>
        <div className="flex justify-center">
          <Mascot pose="cool" size={130} />
        </div>
      </div>
    </>
  );
}

function LanguagePage({ back }: { back: () => void }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <>
      <GHeader title={t("talk.settings.language")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection hint={t("talk.settings.lang.desc")}>
          {LOCALES.map((l) => (
            <GItem
              key={l.code}
              icon={<span>{l.flag}</span>}
              color="transparent"
              label={l.label}
              right={
                locale === l.code ? (
                  <Check className="text-talk size-4" />
                ) : undefined
              }
              onClick={() => setLocale(l.code)}
            />
          ))}
        </GSection>
        <div className="flex justify-center">
          <Globe className="tg-muted size-10" />
        </div>
      </div>
    </>
  );
}

function PasswordPage({ back }: { back: () => void }) {
  const t = useT();
  const { showError } = useTalk();
  const [cur, setCur] = useState("");
  const [nxt, setNxt] = useState("");
  const [rep, setRep] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <GHeader title={t("talk.settings.priv.changePassword")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <GSection>
          <div className="space-y-2 p-3">
            <input
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              placeholder={t("talk.settings.pass.current")}
              className="tg-input"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={nxt}
              onChange={(e) => setNxt(e.target.value)}
              placeholder={t("talk.settings.pass.new")}
              className="tg-input"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={rep}
              onChange={(e) => setRep(e.target.value)}
              placeholder={t("talk.settings.pass.confirm")}
              className="tg-input"
              autoComplete="new-password"
            />
            <GBtn
              variant="primary"
              className="w-full"
              disabled={!cur || nxt.length < 8 || busy}
              onClick={async () => {
                if (nxt !== rep)
                  return toast.error(t("talk.settings.pass.mismatch"));
                setBusy(true);
                try {
                  await talkApi.changePassword(cur, nxt);
                  toast.success(t("talk.settings.pass.changed"));
                  setCur("");
                  setNxt("");
                  setRep("");
                  back();
                } catch (e) {
                  showError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <KeyRound className="size-4" /> {t("talk.settings.pass.change")}
            </GBtn>
          </div>
        </GSection>
        <div className="flex justify-center">
          <Mascot pose="lock" size={130} />
        </div>
      </div>
    </>
  );
}

function AboutPage({ back }: { back: () => void }) {
  const t = useT();
  return (
    <>
      <GHeader title={t("talk.settings.about")} onBack={back} />
      <div className="tg-scroll flex-1 px-3 pt-3 pb-6">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <AsatalkLogo size={84} className="tg-float" />
          <h2 className="text-2xl font-black">{t("talk.name")}</h2>
          <p className="tg-muted text-xs">{t("talk.tagline")}</p>
        </div>
        <GSection>
          <p className="p-4 text-sm leading-7">{t("talk.settings.abt.desc")}</p>
        </GSection>
        <GSection title={t("talk.settings.abt.techTitle")}>
          <p className="tg-muted p-4 text-xs" dir="ltr">
            {t("talk.settings.abt.tech")}
          </p>
        </GSection>
        <GSection>
          <GItem
            icon={<Monitor className="size-4" />}
            color={C.teal}
            label={t("talk.settings.abt.openAsameet")}
            onClick={() =>
              window.open(
                `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`,
                "_blank",
              )
            }
            chevron
          />
        </GSection>
        <p className="tg-muted text-center text-xs">
          {t("talk.settings.abt.madeBy")}
        </p>
        <div className="flex justify-center py-4">
          <Mascot pose="party" size={150} />
        </div>
      </div>
    </>
  );
}
