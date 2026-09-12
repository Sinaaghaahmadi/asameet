import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { loadLocale } from "@/lib/i18n";
import { usePresence } from "@/lib/presence";
import { usePushNavigation } from "@/lib/push";
import { ThemeProvider, useTheme } from "@/ui/theme";
import { CallProvider } from "@/calls/provider";

void SplashScreen.preventAutoHideAsync();
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: true } } });

/** Route guard: signed-out users only ever see the (auth) group. */
function Gate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const th = useTheme();
  usePresence(!!user);
  usePushNavigation();
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)");
    else if (user && inAuth) router.replace("/(tabs)");
    void SplashScreen.hideAsync();
  }, [ready, user, segments, router]);
  return <View style={{ flex: 1, backgroundColor: th.bg }}>{children}</View>;
}

export default function RootLayout() {
  const [localeReady, setLocaleReady] = useState(false);
  useEffect(() => { void loadLocale().finally(() => setLocaleReady(true)); }, []);
  if (!localeReady) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <ThemeProvider>
            <AuthProvider>
              <CallProvider>
                <Gate>
                  <StatusBar style="auto" />
                  <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="chat/[id]" />
                    <Stack.Screen name="call" options={{ presentation: "fullScreenModal", animation: "fade" }} />
                    <Stack.Screen name="qr" options={{ presentation: "modal" }} />
                    <Stack.Screen name="new-group" options={{ presentation: "modal" }} />
                  </Stack>
                </Gate>
              </CallProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
