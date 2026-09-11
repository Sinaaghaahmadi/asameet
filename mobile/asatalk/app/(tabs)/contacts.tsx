import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInvalidate, useUsers } from "@/lib/data";
import { lastSeenLabel } from "@/lib/format";
import { t, errorText } from "@/lib/i18n";
import { Avatar, Empty, Header, IconBtn, Input, Row, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";

export default function ContactsScreen() {
  const th = useTheme();
  const router = useRouter();
  const { user: me } = useAuth();
  const { userList } = useUsers();
  const inv = useInvalidate();
  const [q, setQ] = useState("");
  const list = useMemo(() => userList
    .filter((u) => u.id !== me?.id && !u.isSuspended && (!q || u.displayName.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase().replace("@", ""))))
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.displayName.localeCompare(b.displayName)), [userList, me, q]);

  async function open(userId: string) {
    try {
      const { chat } = await talkApi.createChat({ type: "private", memberIds: [userId] });
      await inv.chats();
      router.push(`/chat/${chat.id}`);
    } catch (e) { toast(errorText(e)); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("contacts.title")} right={<IconBtn name="people-circle-outline" onPress={() => router.push("/new-group")} />} />
      <View style={{ padding: 12 }}><Input value={q} onChangeText={setQ} placeholder={t("contacts.search")} style={{ height: 40, borderRadius: 12 }} /></View>
      <FlatList data={list} keyExtractor={(u) => u.id}
        ListEmptyComponent={<Empty icon="people-outline" title={t("contacts.noResults")} />}
        renderItem={({ item: u }) => (
          <Row onPress={() => open(u.id)}>
            <Avatar name={u.displayName} src={u.avatar} size={48} online={u.isOnline} />
            <View style={{ flex: 1 }}>
              <Txt bold>{u.displayName}</Txt>
              <Txt muted size={12} style={u.isOnline ? { color: th.accent } : null}>{lastSeenLabel(u)}</Txt>
            </View>
            <Txt muted size={12}>@{u.username}</Txt>
          </Row>
        )} />
    </SafeAreaView>
  );
}
