/** Minimal toast so screens do not each carry an alert; rendered by the tabs layout. */
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { useTheme } from "./theme";
import { Txt } from "./primitives";

let show: ((msg: string) => void) | null = null;
export function toast(msg: string) { show?.(msg); }

export function ToastHost() {
  const th = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const [anim] = useState(new Animated.Value(0));
  useEffect(() => {
    show = (m) => {
      setMsg(m);
      Animated.sequence([Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(2200), Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true })]).start(() => setMsg(null));
    };
    return () => { show = null; };
  }, [anim]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { opacity: anim, backgroundColor: th.dark ? "#1f2a44" : "#0f172a" }]}>
      <Txt style={{ color: "#fff", textAlign: "center" }}>{msg}</Txt>
    </Animated.View>
  );
}
const s = StyleSheet.create({ wrap: { position: "absolute", top: 60, left: 20, right: 20, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, zIndex: 999, elevation: 8 } });
