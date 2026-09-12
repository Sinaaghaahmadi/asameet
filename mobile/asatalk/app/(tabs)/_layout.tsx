import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@/lib/i18n";
import { useTheme } from "@/ui/theme";
import { ToastHost } from "@/ui/toast";
import { useChats } from "@/lib/data";

export default function TabsLayout() {
  const th = useTheme();
  const { chats } = useChats();
  const unread = chats.reduce((s, c) => s + (c.isMuted || c.isArchived ? 0 : c.unreadCount), 0);
  return (
    <>
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: th.accent, tabBarInactiveTintColor: th.muted, tabBarStyle: { backgroundColor: th.surface, borderTopColor: th.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}>
        <Tabs.Screen name="index" options={{ title: t("tabs.chats"), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} /> }} />
        <Tabs.Screen name="calls" options={{ title: t("tabs.calls"), tabBarIcon: ({ color, size }) => <Ionicons name="call" size={size} color={color} /> }} />
        <Tabs.Screen name="contacts" options={{ title: t("tabs.contacts"), tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: t("tabs.settings"), tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
      </Tabs>
      <ToastHost />
    </>
  );
}
