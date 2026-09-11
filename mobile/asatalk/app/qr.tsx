/** Scan the QR shown on another device's sign-in screen and approve it. */
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { talkApi } from "@/lib/api";
import { t, errorText } from "@/lib/i18n";
import { Btn, Header, Input, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";

function codeFrom(raw: string): string | null {
  const s = raw.trim();
  if (/^[a-f0-9]{32}$/i.test(s)) return s.toLowerCase();
  try { const u = new URL(s); const c = u.hash.replace(/^#/, "") || u.searchParams.get("code") || ""; return /^[a-f0-9]{32}$/i.test(c) ? c.toLowerCase() : null; } catch { return null; }
}

export default function QrScreen() {
  const th = useTheme();
  const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const [code, setCode] = useState<string | null>(null);
  const [ua, setUa] = useState<string>("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const onScan = useCallback(async (raw: string) => {
    const c = codeFrom(raw); if (!c || code) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try { const r = await talkApi.qrPeek(c); setUa(r.userAgent); setCode(c); } catch { toast(t("qr.expired")); }
  }, [code]);

  async function decide(approve: boolean) {
    if (!code) return; setBusy(true);
    try { await talkApi.qrApprove(code, approve); toast(t(approve ? "qr.approved" : "qr.rejected")); router.back(); }
    catch (e) { toast(errorText(e)); setCode(null); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}>
      <Header title={t("qr.scan")} onBack={() => router.back()} />
      {code ? (
        <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Txt bold size={22}>{t("qr.approveTitle")}</Txt>
          <Txt muted style={{ textAlign: "center" }}>{t("qr.approveSub")}</Txt>
          <View style={{ backgroundColor: th.surface, padding: 14, borderRadius: 14, width: "100%" }}><Txt size={13} style={{ textAlign: "left" }}>{ua || "Unknown device"}</Txt></View>
          <Btn title={t("qr.approve")} loading={busy} onPress={() => void decide(true)} style={{ width: "100%", marginTop: 12, height: 52 }} />
          <Btn variant="ghost" title={t("qr.reject")} onPress={() => void decide(false)} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {perm?.granted ? (
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={(r) => void onScan(r.data)} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
              <Txt muted style={{ textAlign: "center" }}>{t("qr.noCamera")}</Txt>
              <Btn title={t("common.confirm")} onPress={() => void requestPerm()} />
            </View>
          )}
          <View style={{ padding: 16, gap: 8 }}>
            <Txt muted size={12} style={{ textAlign: "center" }}>{t("qr.hint")}</Txt>
            <Input value={manual} onChangeText={(v) => { setManual(v); const c = codeFrom(v); if (c) void onScan(c); }} placeholder="a1b2c3…" autoCapitalize="none" style={{ textAlign: "left" }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
