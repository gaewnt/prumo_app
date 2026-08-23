import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { QuickTechnique } from "@/lib/mente";

export function TechniqueCard({ technique }: { technique: QuickTechnique }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 12,
        padding: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13.5, color: tokens.text }}>{technique.title}</Text>
      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{technique.description}</Text>
    </View>
  );
}
