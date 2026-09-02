import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { RideQuality } from "@/lib/veiculo";
import { QUALITY_LABELS } from "@/components/veiculo/format";

type QualityBadgeProps = {
  quality: RideQuality;
};

/** Selo BOM/MÉDIO/RUIM — usado no calculador do Copiloto e no histórico de corridas. */
export function QualityBadge({ quality }: QualityBadgeProps) {
  const { tokens } = useTheme();
  const color = quality === "bom" ? tokens.success : quality === "medio" ? tokens.warning : tokens.danger;
  const bg = quality === "bom" ? tokens.successMuted : quality === "medio" ? tokens.warningMuted : tokens.dangerMuted;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 10.5, color }}>
        {QUALITY_LABELS[quality]}
      </Text>
    </View>
  );
}
