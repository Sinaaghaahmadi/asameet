import React from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats, useUsers } from "@/lib/data";
import { digits, formatDuration, relativeDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useCalls } from "@/calls/provider";
import { Avatar, Empty, Header, IconBtn, Row, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

export default function CallsScreen() {
  const th = useTheme();
  const { user: me } = useAuth();
  const { users } = useUsers();
  const { chats } = useChats();
  const { startCall } = useCalls();
  const q = useQuery({ queryKey: ["calls"], queryFn: () => talkApi.calls(), refetchInterval: 15_000 });
  const calls = q.data?.calls ?? [];
  if (!me) return null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top"]}>
      <Header title={t("calls.title")} />
      <FlatList data={calls} keyExtractor={(c) => c.id} refreshing={q.isLoading} onRefresh={() => void q.refetch()}
        ListEmptyComponent={!q.isLoading ? <Empty icon="call-outline" title={t("calls.noCalls")} desc={t("calls.noCallsDesc")} /> : null}
        renderItem={({ item: c }) => {
          const peerId = c.initiatorId === me.id ? c.peerId : c.initiatorId;
          const peer = peerId ? users.get(peerId) : undefined;
          const group = c.chatId ? chats.find((x) => x.id === c.chatId) : undefined;
          const title = peer?.displayName ?? group?.name ?? t("deletedAccount");
          const missed = c.direction === "missed";
          const icon = missed ? "call-outline" : c.direction === "incoming" ? "arrow-down-outline" : "arrow-up-outline";
          return (
            <Row>
              <Avatar name={title} src={peer?.avatar ?? group?.avatar} size={48} online={peer?.isOnline} />
              <View style={{ flex: 1 }}>
                <Txt bold style={missed ? { color: th.danger } : null}>{title}</Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name={icon} size={13} color={missed ? th.danger : th.muted} />
                  <Txt muted size={12}>{c.type === "video" ? t("calls.videoCall") : t("calls.audioCall")} · {t(`calls.${c.direction}`)}{c.duration ? ` · ${digits(formatDuration(c.duration))}` : ""}</Txt>
                </View>
              </View>
              <Txt muted size={11}>{relativeDay(c.createdAt)}</Txt>
              {peer && <IconBtn name={c.type === "video" ? "videocam" : "call"} color={th.accent} onPress={() => void startCall(peer, c.type)} />}
            </Row>
          );
        }} />
    </SafeAreaView>
  );
}
