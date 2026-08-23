import React from "react";
import { View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";

type StepProgressProps = {
  total: number;
  current: number; // 0-indexed
};

/** Barra de segmentos no topo do onboarding — um segmento por pergunta. */
export function StepProgress({ total, current }: StepProgressProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= current ? tokens.accent : tokens.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}
