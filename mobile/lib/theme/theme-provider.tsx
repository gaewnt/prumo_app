import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type ThemeTokens } from "@/lib/theme/tokens";
import { useThemeStore } from "@/lib/store/theme-store";

type ThemeContextValue = {
  tokens: ThemeTokens;
  scheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);

  const scheme: "light" | "dark" = useMemo(() => {
    if (preference === "system") return systemScheme === "dark" ? "dark" : "light";
    return preference;
  }, [preference, systemScheme]);

  const tokens = scheme === "dark" ? darkTheme : lightTheme;

  const value = useMemo(() => ({ tokens, scheme }), [tokens, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
