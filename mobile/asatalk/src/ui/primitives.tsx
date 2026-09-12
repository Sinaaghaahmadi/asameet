import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "./theme";
import { hueOf, initials } from "@/lib/format";

export const FONT = "Vazirmatn";

export function Txt({ style, muted, bold, size, children, ...rest }: React.ComponentProps<typeof Text> & { muted?: boolean; bold?: boolean; size?: number }) {
  const th = useTheme();
  return <Text style={[{ color: muted ? th.muted : th.fg, fontSize: size ?? 15, fontWeight: bold ? "700" : "400", textAlign: "left", writingDirection: "auto" }, style]} {...rest}>{children}</Text>;
}

export function Btn({ title, icon, variant = "primary", loading, style, disabled, ...rest }: PressableProps & { title?: string; icon?: keyof typeof Ionicons.glyphMap; variant?: "primary" | "glass" | "danger" | "ghost"; loading?: boolean; style?: ViewStyle }) {
  const th = useTheme();
  const bg = variant === "primary" ? th.accent : variant === "danger" ? th.danger : variant === "ghost" ? "transparent" : th.glass;
  const fg = variant === "primary" || variant === "danger" ? "#fff" : th.fg;
  return (
    <Pressable disabled={disabled || loading} style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }, style]} {...rest}>
      {loading ? <ActivityIndicator color={fg} /> : (<>
        {icon && <Ionicons name={icon} size={18} color={fg} />}
        {title ? <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{title}</Text> : null}
      </>)}
    </Pressable>
  );
}

export function IconBtn({ name, onPress, color, size = 22, style, bg }: { name: keyof typeof Ionicons.glyphMap; onPress?: () => void; color?: string; size?: number; style?: ViewStyle; bg?: string }) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [s.iconBtn, bg ? { backgroundColor: bg } : null, { opacity: pressed ? 0.6 : 1 }, style]}>
      <Ionicons name={name} size={size} color={color ?? th.fg} />
    </Pressable>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  const th = useTheme();
  return <TextInput placeholderTextColor={th.muted} style={[s.input, { backgroundColor: th.surface2, color: th.fg, borderColor: th.line }, style as TextStyle]} {...rest} />;
}

export function Avatar({ name, src, size = 44, online }: { name: string; src?: string | null; size?: number; online?: boolean }) {
  const th = useTheme();
  const hue = hueOf(name);
  return (
    <View style={{ width: size, height: size }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue} 60% 45%)`, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.38 }}>{initials(name)}</Text>
        </View>
      )}
      {online && <View style={{ position: "absolute", bottom: 0, right: 0, width: size * 0.28, height: size * 0.28, borderRadius: 99, backgroundColor: th.success, borderWidth: 2, borderColor: th.surface }} />}
    </View>
  );
}

export function Row({ children, style, onPress, onLongPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; onLongPress?: () => void }) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [s.row, { backgroundColor: pressed ? th.glass : "transparent" }, style]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      {title ? <Txt muted size={12} style={{ marginHorizontal: 20, marginBottom: 6, fontWeight: "700" }}>{title}</Txt> : null}
      <View style={{ backgroundColor: th.surface, borderRadius: 16, marginHorizontal: 12, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

export function Item({ icon, color, label, value, onPress, right, danger }: { icon?: keyof typeof Ionicons.glyphMap; color?: string; label: string; value?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean }) {
  const th = useTheme();
  return (
    <Row onPress={onPress} style={{ paddingVertical: 12 }}>
      {icon && <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color ?? th.accent, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={17} color="#fff" /></View>}
      <View style={{ flex: 1 }}>
        <Txt style={{ color: danger ? th.danger : th.fg }}>{label}</Txt>
        {value ? <Txt muted size={12}>{value}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-back" size={18} color={th.muted} style={{ transform: [{ scaleX: -1 }] }} /> : null)}
    </Row>
  );
}

export function Empty({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap; title: string; desc?: string }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 }}>
      <Ionicons name={icon} size={56} color={th.muted} />
      <Txt bold size={17}>{title}</Txt>
      {desc ? <Txt muted style={{ textAlign: "center" }}>{desc}</Txt> : null}
    </View>
  );
}

export function Header({ title, subtitle, left, right, onBack }: { title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode; onBack?: () => void }) {
  const th = useTheme();
  return (
    <View style={[s.header, { backgroundColor: th.surface, borderBottomColor: th.line }]}>
      {onBack ? <IconBtn name="arrow-forward" onPress={onBack} /> : left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt bold size={17} numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt muted size={12} numberOfLines={1}>{subtitle}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, paddingHorizontal: 18, borderRadius: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  input: { height: 50, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, textAlign: "right" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, height: 56, borderBottomWidth: StyleSheet.hairlineWidth },
});
