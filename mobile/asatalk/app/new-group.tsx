import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInvalidate, useUsers } from "@/lib/data";
import { t, errorText } from "@/lib/i18n";
import { Avatar, Btn, Header, Input, Row, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";

export default function NewGroup() {
  const th = useTheme();
  const router = useRouter();
  const { user: me } = useAuth();
  const { userList } = useUsers();
  const inv = useInvalidate();
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => userList.filter((u) => u.id !== me?.id && (!q || u.displayName.toLowerCase().includes(q.toLowerCase()))), [userList, me, q]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}>
      <Header title={t("contacts.newGroup")} onBack={() => router.back()} />
      <View style={{ padding: 12, gap: 8 }}>
        <Input value={name} onChangeText={setName} placeholder={t("contacts.groupName")} />
        <Input value={q} onChangeText={setQ} placeholder={t("contacts.search")} style={{ height: 40 }} />
        <Txt muted size={12}>{t("contacts.selectMembers")} ({sel.length})</Txt>
      </View>
      <FlatList data={list} keyExtractor={(u) => u.id} renderItem={({ item: u }) => {
        const on = sel.includes(u.id);
        return (
          <Row onPress={() => setSel((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))}>
            <Avatar name={u.displayName} src={u.avatar} size={44} />
            <Txt style={{ flex: 1 }}>{u.displayName}</Txt>
            <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={24} color={on ? th.accent : th.muted} />
          </Row>
        );
      }} />
      <View style={{ padding: 12 }}>
        <Btn title={t("contacts.create")} loading={busy} disabled={!name.trim() || sel.length === 0} onPress={async () => {
          setBusy(true);
          try { const { chat } = await talkApi.createChat({ type: "group", name: name.trim(), memberIds: sel }); await inv.chats(); router.replace(`/chat/${chat.id}`); }
          catch (e) { toast(errorText(e)); } finally { setBusy(false); }
        }} />
      </View>
    </SafeAreaView>
  );
}
