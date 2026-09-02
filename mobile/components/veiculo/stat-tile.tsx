import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type StatTileProps = {
  label: string;
  value: string;
};

/** Tile pequeno pro grid 2 colunas de indicadores (horas, km, R$/hora, R$/km...). */
export function StatTile({ label, value }: StatTileProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }} numberOfLines={2}>
        {label}
      </Text>
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 17, color: tokens.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
