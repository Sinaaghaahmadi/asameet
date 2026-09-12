/** Chat list: folder chips, rows with unread / pin / mute, long-press actions. */
import React, { useMemo, useState } from "react";
import { ActionSheetIOS, Alert, FlatList, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats, useInvalidate, useUsers } from "@/lib/data";
import { chatDisplayName, digits, isSavedChat, messagePreview, peerOf, relativeDay } from "@/lib/format";
import { t, errorText } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Chat } from "@/lib/types";
import { Avatar, Empty, Input, Row, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";

const FOLDERS = ["all", "personal", "groups", "channels", "unread"] as const;

export default function ChatsScreen() {
  const th = useTheme();
  const router = useRouter();
  const { user: me } = useAuth();
  const { users } = useUsers();
  const { chats, loading, refetch } = useChats();
  const inv = useInvalidate();
  const drafts = useStore((s) => s.drafts);
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => chats.filter((c) => {
    if (c.isArchived) return false;
    if (folder === "personal" && c.type !== "private") return false;
    if (folder === "groups" && c.type !== "group") return false;
    if (folder === "channels" && c.type !== "channel") return false;
    if (folder === "unread" && c.unreadCount === 0) return false;
    if (q && me) return chatDisplayName(c, users, me.id).toLowerCase().includes(q.toLowerCase());
    return true;
  }), [chats, folder, q, users, me]);

  if (!me) return null;

  const actions = (c: Chat) => {
    const opts = [c.isPinned ? t("chat.unpin") : t("chat.pin"), c.isMuted ? t("chat.unmute") : t("chat.mute"), c.type === "private" ? t("chat.delete") : t("chat.leave"), t("common.cancel")];
    const run = async (i: number) => {
      try {
        if (i === 0) await talkApi.chatPrefs(c.id, { pinned: !c.isPinned });
        else if (i === 1) await talkApi.chatPrefs(c.id, { muted: !c.isMuted });
        else if (i === 2) {
          Alert.alert(opts[2], c.type === "private" ? t("chat.deleteConfirm") : t("chat.leaveConfirm"), [
            { text: t("common.cancel"), style: "cancel" },
            { text: opts[2], style: "destructive", onPress: async () => { try { if (c.type === "private") await talkApi.deleteChat(c.id); else await talkApi.chatMembers(c.id, "leave"); await inv.chats(); } catch (e) { toast(errorText(e)); } } },
          ]);
          return;
        }
        await inv.chats();
      } catch (e) { toast(errorText(e)); }
    };
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 3, destructiveButtonIndex: 2 }, run);
    else Alert.alert(chatDisplayName(c, users, me.id), undefined, [...opts.slice(0, 3).map((o, i) => ({ text: o, onPress: () => run(i) })), { text: opts[3], style: "cancel" as const }]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56 }}>
        <Txt bold size={22} style={{ flex: 1 }}>{t("name")}</Txt>
        <Pressable onPress={() => router.push("/qr")} hitSlop={8}><Ionicons name="qr-code-outline" size={22} color={th.fg} /></Pressable>
      </View>
      <View style={{ paddingHorizontal: 12 }}>
        <Input value={q} onChangeText={setQ} placeholder={t("common.search")} style={{ height: 40, borderRadius: 12 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 10 }} style={{ flexGrow: 0 }}>
        {FOLDERS.map((f) => (
          <Pressable key={f} onPress={() => setFolder(f)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: folder === f ? th.accent : th.glass }}>
            <Txt size={13} style={{ color: folder === f ? "#fff" : th.fg, fontWeight: "700" }}>{t(`folders.${f}`)}</Txt>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        refreshing={loading}
        onRefresh={() => void refetch()}
        ListEmptyComponent={!loading ? <Empty icon="chatbubbles-outline" title={t("list.noChats")} desc={t("list.noChatsDesc")} /> : null}
        renderItem={({ item: c }) => {
          const title = chatDisplayName(c, users, me.id);
          const peer = peerOf(c, me.id);
          const saved = isSavedChat(c, me.id);
          const peerUser = peer ? users.get(peer) : undefined;
          const typing = (c.typingUserIds ?? []).filter((id) => id !== me.id).length > 0;
          const draft = drafts[c.id];
          const preview = typing ? t("list.typing") : draft ? `${t("list.draft")}: ${draft}` : c.lastMessage != null
            ? `${c.type !== "private" && c.lastMessageSenderId ? (c.lastMessageSenderId === me.id ? t("list.you") : users.get(c.lastMessageSenderId)?.displayName ?? "") + ": " : ""}${messagePreview({ type: c.lastMessageType ?? "text", content: c.lastMessage, meta: {} })}` : "";
          return (
            <Row onPress={() => router.push(`/chat/${c.id}`)} onLongPress={() => actions(c)} style={{ paddingVertical: 10 }}>
              {saved ? <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: th.accent, alignItems: "center", justifyContent: "center" }}><Ionicons name="bookmark" size={24} color="#fff" /></View>
                : <Avatar name={title} src={c.type === "private" ? peerUser?.avatar : c.avatar} size={52} online={peerUser?.isOnline} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {c.type === "group" && <Ionicons name="people" size={14} color={th.muted} />}
                  {c.type === "channel" && <Ionicons name="megaphone" size={14} color={th.muted} />}
                  <Txt bold size={15} numberOfLines={1} style={{ flex: 1 }}>{title}</Txt>
                  {c.isMuted && <Ionicons name="notifications-off" size={14} color={th.muted} />}
                  <Txt muted size={11}>{c.lastMessageAt ? relativeDay(c.lastMessageAt) : ""}</Txt>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <Txt muted size={13} numberOfLines={1} style={[{ flex: 1 }, typing && { color: th.accent }, draft ? { color: th.danger } : null]}>{preview}</Txt>
                  {c.isPinned && c.unreadCount === 0 && <Ionicons name="pin" size={14} color={th.muted} />}
                  {c.unreadCount > 0 && <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: c.isMuted ? th.muted : th.accent, alignItems: "center", justifyContent: "center" }}><Txt size={12} style={{ color: "#fff", fontWeight: "800" }}>{digits(c.unreadCount)}</Txt></View>}
                </View>
              </View>
            </Row>
          );
        }}
      />
      <Pressable onPress={() => router.push("/(tabs)/contacts")} style={{ position: "absolute", bottom: 20, left: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: th.accent, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
        <Ionicons name="create" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}
