import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { makeTheme, type Theme } from "@/lib/theme";
import { useStore } from "@/lib/store";

const Ctx = createContext<Theme>(makeTheme(true, "sky"));
export const useTheme = () => useContext(Ctx);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const { theme, accent } = useStore((s) => s.settings);
  const value = useMemo(() => makeTheme(theme === "system" ? scheme !== "light" : theme !== "light", accent), [theme, accent, scheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
