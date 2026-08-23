import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

export type DonutItem = { label: string; value: number; color: string };

type CategoryDonutProps = {
  items: DonutItem[];
  size?: number;
  strokeWidth?: number;
};

/**
 * Donut + legenda com %, no padrão do relatório de categoria dos apps de
 * referência. Depende de `react-native-svg` — rodar
 * `npx expo install react-native-svg` se ainda não estiver instalado.
 */
export function CategoryDonut({ items, size = 92, strokeWidth = 16 }: CategoryDonutProps) {
  const { tokens } = useTheme();
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={tokens.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        {total > 0
          ? items.map((item, index) => {
              const fraction = item.value / total;
              const segmentLength = fraction * circumference;
              const dashArray = `${segmentLength} ${circumference - segmentLength}`;
              const dashOffset = -accumulated;
              accumulated += segmentLength;
              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  fill="none"
                  rotation={-90}
                  origin={`${center}, ${center}`}
                />
              );
            })
          : null}
      </Svg>

      <View style={{ flex: 1, gap: 6 }}>
        {items.map((item, index) => (
          <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: item.color }} />
            <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 12, color: tokens.text }} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: tokens.textMuted }}>
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
