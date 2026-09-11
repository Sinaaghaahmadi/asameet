/**
 * Sign-in: phone/email → 6-digit code (typed on the device keyboard) →
 * name for a new account. Username + password stays as the alternative.
 */
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, errorText } from "@/lib/i18n";
import { digits } from "@/lib/format";
import { registerPush } from "@/lib/push";
import { useTheme } from "@/ui/theme";
import { Btn, Input, Txt } from "@/ui/primitives";
import { toast } from "@/ui/toast";

type Step = "signin" | "otp" | "profile" | "password" | "notif";

function detectKind(v: string): "phone" | "email" | null {
  const s = v.trim();
  if (!s) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "email";
  const d = s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[\s()+-]/g, "");
  return /^\d{10,15}$/.test(d) ? "phone" : null;
}

export default function SignIn() {
  const th = useTheme();
  const { setSession } = useAuth();
  const [step, setStep] = useState<Step>("signin");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [ttl, setTtl] = useState(0);
  const [demo, setDemo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<Parameters<typeof setSession>[0] | null>(null);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => { if (step === "otp" && ttl > 0) { const id = setTimeout(() => setTtl((v) => v - 1), 1000); return () => clearTimeout(id); } }, [step, ttl]);
  useEffect(() => { if (step === "otp") setTimeout(() => codeRef.current?.focus(), 250); }, [step]);

  async function requestCode() {
    if (!detectKind(identifier)) return;
    setBusy(true);
    try {
      const r = await talkApi.otpRequest(identifier);
      setDemo(r.demoCode ?? null); setTtl(Math.min(r.ttl ?? 120, 120)); setCode(""); setStep("otp");
    } catch (e) { toast(errorText(e)); } finally { setBusy(false); }
  }
  async function verify(full: string) {
    setBusy(true);
    try {
      const { user, isNew } = await talkApi.otpVerify(identifier, full);
      if (isNew) { pending.current = user; setStep("profile"); }
      else finish(user);
    } catch (e) {
      const c = (e as { code?: string }).code;
      if (c === "invalid_credentials" || c === "invalid_code") { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); setCode(""); toast(t("onboard.wrongCode")); }
      else toast(errorText(e));
    } finally { setBusy(false); }
  }
  async function saveProfile() {
    if (!name.trim()) return;
    setBusy(true);
    try { const { user } = await talkApi.updateProfile({ displayName: name.trim() }); pending.current = user; setStep("notif"); }
    catch (e) { toast(errorText(e)); } finally { setBusy(false); }
  }
  async function loginPassword() {
    if (!username.trim() || !password) return;
    setBusy(true);
    try { const { user } = await talkApi.login(username.trim(), password); finish(user); }
    catch (e) { toast(errorText(e)); } finally { setBusy(false); }
  }
  function finish(user: Parameters<typeof setSession>[0]) {
    setSession(user);
    void talkApi.me().then((r) => setSession(r.user, r.settings)).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 48 }} keyboardShouldPersistTaps="handled">
          {step === "signin" && (<>
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: th.accent, alignItems: "center", justifyContent: "center" }}>
                <Txt style={{ color: "#fff", fontSize: 44, fontWeight: "900" }}>آ</Txt>
              </View>
            </View>
            <Txt bold size={24} style={{ textAlign: "center" }}>{t("onboard.signinTitle")}</Txt>
            <Txt muted style={{ textAlign: "center", marginTop: 6, lineHeight: 22 }}>{t("onboard.signinSub")}</Txt>
            <Input value={identifier} onChangeText={setIdentifier} placeholder={t("onboard.identifier")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={{ marginTop: 28, textAlign: "left" }} onSubmitEditing={requestCode} returnKeyType="go" />
            <Btn title={t("onboard.getCode")} loading={busy} disabled={!detectKind(identifier)} onPress={requestCode} style={{ marginTop: 12, height: 52 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: th.line }} /><Txt muted size={12}>{t("onboard.or")}</Txt><View style={{ flex: 1, height: 1, backgroundColor: th.line }} />
            </View>
            <Btn variant="glass" icon="key-outline" title={t("onboard.password")} onPress={() => setStep("password")} />
            <Txt muted size={11} style={{ textAlign: "center", marginTop: "auto", paddingTop: 24, lineHeight: 18 }}>{t("onboard.terms")}</Txt>
          </>)}

          {step === "otp" && (<>
            <Txt bold size={24} style={{ textAlign: "center" }}>{t("onboard.otpTitle")}</Txt>
            <Txt muted style={{ textAlign: "center", marginTop: 6 }}>{t("onboard.otpSentTo", { id: identifier })}</Txt>
            <Pressable onPress={() => setStep("signin")}><Txt style={{ color: th.accent, textAlign: "center", marginTop: 6, fontWeight: "700" }}>{t("onboard.change")}</Txt></Pressable>
            {demo && <Pressable onPress={() => { setCode(demo); void verify(demo); }} style={{ alignSelf: "center", marginTop: 14, backgroundColor: th.glass, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
              <Txt size={13}>{t("onboard.demoCode")}: <Txt style={{ color: th.accent, letterSpacing: 4, fontWeight: "800" }}>{demo}</Txt></Txt>
            </Pressable>}
            {/* Six boxes drawn over one real input, so SMS autofill and the device keyboard both work. */}
            <Pressable onPress={() => codeRef.current?.focus()} style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 28, direction: "ltr" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: 46, height: 56, borderRadius: 14, backgroundColor: th.surface2, borderWidth: 2, borderColor: i === code.length ? th.accent : th.line, alignItems: "center", justifyContent: "center" }}>
                  <Txt bold size={24}>{code[i] ? digits(code[i]) : ""}</Txt>
                </View>
              ))}
              <TextInput ref={codeRef} value={code} onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 6); setCode(d); if (d.length === 6) void verify(d); }} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} editable={!busy} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
            </Pressable>
            <Txt muted style={{ textAlign: "center", marginTop: 18 }}>
              {ttl > 0 ? `${t("onboard.resendIn")} ${digits(`${Math.floor(ttl / 60)}:${String(ttl % 60).padStart(2, "0")}`)}` : <Txt style={{ color: th.accent, fontWeight: "700" }} onPress={requestCode}>{t("onboard.resend")}</Txt>}
            </Txt>
          </>)}

          {step === "profile" && (<>
            <Txt bold size={24} style={{ textAlign: "center" }}>{t("onboard.whoTitle")}</Txt>
            <Txt muted style={{ textAlign: "center", marginTop: 6 }}>{t("onboard.whoSub")}</Txt>
            <Input value={name} onChangeText={setName} placeholder={t("onboard.nameField")} style={{ marginTop: 28 }} autoFocus onSubmitEditing={saveProfile} />
            <Btn title={t("onboard.continueBtn")} loading={busy} disabled={!name.trim()} onPress={saveProfile} style={{ marginTop: 12, height: 52 }} />
          </>)}

          {step === "notif" && (<>
            <View style={{ alignItems: "center", marginTop: 40 }}><Ionicons name="notifications" size={72} color={th.accent} /></View>
            <Txt bold size={22} style={{ textAlign: "center", marginTop: 20 }}>{t("onboard.notifTitle")}</Txt>
            <Txt muted style={{ textAlign: "center", marginTop: 6 }}>{t("onboard.notifSub")}</Txt>
            <Btn title={t("onboard.turnOn")} loading={busy} onPress={async () => { setBusy(true); await registerPush(); setBusy(false); if (pending.current) finish(pending.current); }} style={{ marginTop: 28, height: 52 }} />
            <Btn variant="ghost" title={t("onboard.notNow")} onPress={() => pending.current && finish(pending.current)} style={{ marginTop: 6 }} />
          </>)}

          {step === "password" && (<>
            <Txt bold size={24} style={{ textAlign: "center" }}>{t("onboard.password")}</Txt>
            <Input value={username} onChangeText={setUsername} placeholder={t("onboard.username")} autoCapitalize="none" autoCorrect={false} style={{ marginTop: 28, textAlign: "left" }} />
            <Input value={password} onChangeText={setPassword} placeholder={t("onboard.passwordField")} secureTextEntry style={{ marginTop: 10, textAlign: "left" }} onSubmitEditing={loginPassword} />
            <Btn title={t("onboard.login")} loading={busy} onPress={loginPassword} style={{ marginTop: 12, height: 52 }} />
            <Btn variant="ghost" title={t("common.back")} onPress={() => setStep("signin")} style={{ marginTop: 6 }} />
          </>)}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
