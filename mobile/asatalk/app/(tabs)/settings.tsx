import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { talkApi, type TalkSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, locale, setLocale, errorText } from "@/lib/i18n";
import { ACCENTS } from "@/lib/theme";
import { registerPush } from "@/lib/push";
import { useStore } from "@/lib/store";
import { Avatar, Btn, Header, Input, Item, Section, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";
import { Pressable } from "react-native";

type Page = "root" | "profile" | "notifications" | "chat" | "devices";

export default function SettingsScreen() {
  const th = useTheme();
  const router = useRouter();
  const { user: me, logout, setSession } = useAuth();
  const { settings, patchSettings } = useStore();
  const [page, setPage] = useState<Page>("root");
  const [name, setName] = useState(me?.displayName ?? "");
  const [username, setUsername] = useState(me?.username ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(me?.displayName ?? ""); setUsername(me?.username ?? ""); setBio(me?.bio ?? ""); }, [me]);
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => talkApi.sessions(), enabled: page === "devices" });
  if (!me) return null;

  const save = async (patch: TalkSettings) => {
    patchSettings(patch);
    try { await talkApi.updateSettings(patch); } catch (e) { toast(errorText(e)); }
  };
  const Toggle = ({ k, label }: { k: keyof TalkSettings & string; label: string }) => (
    <Item label={label} right={<Switch value={!!settings[k]} onValueChange={(v) => void save({ [k]: v })} trackColor={{ true: th.accent }} />} />
  );

  if (page === "profile") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("settings.editProfile")} onBack={() => setPage("root")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}><Avatar name={name || "?"} src={me.avatar} size={96} /></View>
        <Txt muted size={12}>{t("settings.name")}</Txt><Input value={name} onChangeText={setName} />
        <Txt muted size={12}>{t("settings.username")}</Txt><Input value={username} onChangeText={setUsername} autoCapitalize="none" style={{ textAlign: "left" }} />
        <Txt muted size={12}>{t("settings.bio")}</Txt><Input value={bio} onChangeText={setBio} multiline style={{ height: 90, paddingTop: 12 }} />
        <Btn title={t("settings.save")} loading={busy} onPress={async () => {
          setBusy(true);
          try { const { user } = await talkApi.updateProfile({ displayName: name.trim(), username: username.trim().replace(/^@/, "") || undefined, bio }); setSession(user); toast(t("settings.saved")); setPage("root"); }
          catch (e) { toast(errorText(e)); } finally { setBusy(false); }
        }} />
      </ScrollView>
    </SafeAreaView>
  );

  if (page === "notifications") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("settings.notifications")} onBack={() => setPage("root")} />
      <ScrollView>
        <Section>
          <Toggle k="notifPrivate" label={t("settings.notifPrivate")} />
          <Toggle k="notifGroups" label={t("settings.notifGroups")} />
          <Toggle k="notifChannels" label={t("settings.notifChannels")} />
          <Toggle k="notifPreview" label={t("settings.notifPreview")} />
          <Toggle k="notifSound" label={t("settings.notifSound")} />
        </Section>
        <Section>
          <Item icon="phone-portrait-outline" label={t("settings.pushEnabled")} onPress={async () => { const tok = await registerPush(); toast(tok ? t("settings.saved") : t("errors.generic")); }} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );

  if (page === "chat") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("settings.chatSettings")} onBack={() => setPage("root")} />
      <ScrollView>
        <Section title={t("settings.theme")}>
          {(["light", "dark", "system"] as const).map((v) => <Item key={v} label={t(`settings.${v}`)} onPress={() => void save({ theme: v })} right={settings.theme === v ? <Txt style={{ color: th.accent }}>✓</Txt> : <View />} />)}
        </Section>
        <Section title={t("settings.accent")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 14 }}>
            {Object.entries(ACCENTS).map(([k, a]) => (
              <Pressable key={k} onPress={() => void save({ accent: k })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.main, borderWidth: settings.accent === k ? 3 : 0, borderColor: th.fg }} />
            ))}
          </View>
        </Section>
        <Section title={t("settings.language")}>
          {(["fa", "en"] as const).map((l) => <Item key={l} label={l === "fa" ? "فارسی" : "English"} right={locale() === l ? <Txt style={{ color: th.accent }}>✓</Txt> : <View />} onPress={async () => { const reload = await setLocale(l); if (reload) await Updates.reloadAsync().catch(() => {}); }} />)}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );

  if (page === "devices") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("settings.devices")} onBack={() => setPage("root")} />
      <ScrollView>
        <Section><Item icon="qr-code-outline" label={t("qr.scan")} onPress={() => router.push("/qr")} /></Section>
        <Section title={t("settings.currentDevice")}>
          {(sessions.data?.sessions ?? []).filter((s) => s.current).map((s) => <Item key={s.id} icon="phone-portrait" color={th.success} label={s.userAgent ?? "—"} />)}
        </Section>
        <Section title={t("settings.otherDevices")}>
          {(sessions.data?.sessions ?? []).filter((s) => !s.current).map((s) => (
            <Item key={s.id} icon="laptop-outline" color={th.muted} label={s.userAgent ?? "—"} value={new Date(s.lastUsedAt).toLocaleString()} right={<Btn variant="ghost" title={t("settings.terminate")} onPress={async () => { await talkApi.terminateSession(s.id).catch(() => {}); void sessions.refetch(); }} style={{ height: 34 }} />} />
          ))}
          {(sessions.data?.sessions ?? []).filter((s) => !s.current).length > 1 && <Item icon="shield-outline" color={th.danger} danger label={t("settings.terminateAll")} onPress={async () => { await talkApi.terminateSession().catch(() => {}); void sessions.refetch(); }} />}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("settings.title")} />
      <ScrollView>
        <Pressable onPress={() => setPage("profile")} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
          <Avatar name={me.displayName} src={me.avatar} size={64} />
          <View style={{ flex: 1 }}><Txt bold size={18}>{me.displayName}</Txt><Txt muted>@{me.username}</Txt></View>
        </Pressable>
        <Section>
          <Item icon="person-outline" color="#3b82f6" label={t("settings.editProfile")} onPress={() => setPage("profile")} />
          <Item icon="notifications-outline" color="#ef4444" label={t("settings.notifications")} onPress={() => setPage("notifications")} />
          <Item icon="color-palette-outline" color="#8b5cf6" label={t("settings.chatSettings")} onPress={() => setPage("chat")} />
          <Item icon="phone-portrait-outline" color="#22c55e" label={t("settings.devices")} onPress={() => setPage("devices")} />
        </Section>
        <Section>
          <Item icon="information-circle-outline" color="#64748b" label={t("settings.about")} value={`${t("settings.version")} ${Constants.expoConfig?.version ?? ""}`} />
          <Item icon="log-out-outline" color="#ef4444" danger label={t("settings.logout")} onPress={() => Alert.alert(t("settings.logout"), t("settings.logoutConfirm"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("settings.logout"), style: "destructive", onPress: () => void logout(false) }])} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
