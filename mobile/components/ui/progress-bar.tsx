import React from "react";
import { View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";

type ProgressBarProps = {
  /** 0–1. Valores fora da faixa são presos (clamp) nas pontas. */
  progress: number;
  height?: number;
  color?: string;
};

/** Barra horizontal simples — extraída do card de livro pra virar padrão reutilizável. */
export function ProgressBar({ progress, height = 8, color }: ProgressBarProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: tokens.surfaceAlt,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.round(clamped * 100)}%`,
          backgroundColor: color ?? tokens.accent,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
