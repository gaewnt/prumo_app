import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type StatCardProps = {
  label: string;
  value: string;
  /** Ex: "▲ 18%" — já formatado pelo chamador, porque só ele sabe se subir é bom ou ruim. */
  deltaLabel?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  children?: React.ReactNode;
};

/**
 * Substituto direto do card de insight de IA: número calculado na hora +
 * variação em relação ao período anterior, sem nenhum texto gerado.
 */
export function StatCard({ label, value, deltaLabel, deltaTone = "neutral", children }: StatCardProps) {
  const { tokens } = useTheme();
  const deltaColor =
    deltaTone === "positive" ? tokens.success : deltaTone === "negative" ? tokens.danger : tokens.textMuted;
  const deltaBg =
    deltaTone === "positive"
      ? tokens.successMuted
      : deltaTone === "negative"
        ? tokens.dangerMuted
        : tokens.surfaceAlt;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {label}
          </Text>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 22, color: tokens.text, marginTop: 4 }}>
            {value}
          </Text>
        </View>
        {deltaLabel ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              color: deltaColor,
              backgroundColor: deltaBg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            {deltaLabel}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
