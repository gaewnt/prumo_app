import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useThemeStore } from "@/lib/store/theme-store";
import type { ThemePreference } from "@/lib/theme/tokens";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export function ThemeToggle() {
  const { tokens } = useTheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 10,
        padding: 3,
        gap: 3,
      }}
    >
      {OPTIONS.map((option) => {
        const active = option.value === preference;
        return (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: active ? tokens.accent : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 13,
                color: active ? tokens.accentText : tokens.textMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
