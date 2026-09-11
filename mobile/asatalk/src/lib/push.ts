/**
 * Native push through Expo's push service. The token is registered on the
 * same /api/push route the web app uses, prefixed `expo:` so the server can
 * tell it from a Web Push endpoint and route it to exp.host.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { talkApi } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

export async function registerPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", { name: "پیام‌ها", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 80] });
    await Notifications.setNotificationChannelAsync("calls", { name: "تماس‌ها", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 300, 120, 300], sound: "default" });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === "granted" ? { status: existing } : await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await talkApi.pushSubscribe(data);
    return data;
  } catch {
    return null;
  }
}

/** Tapping a notification lands in the chat or the ringing call. */
export function usePushNavigation() {
  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      if (data.callId) router.push({ pathname: "/call", params: { id: String(data.callId), incoming: "1" } });
      else if (data.chatId) router.push(`/chat/${String(data.chatId)}`);
    };
    void Notifications.getLastNotificationResponseAsync().then((r) => open(r?.notification.request.content.data));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => sub.remove();
  }, []);
}
