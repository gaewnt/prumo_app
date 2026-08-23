import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

export type WeeklyBarChartDay = { label: string; value: number };

type WeeklyBarChartProps = {
  data: WeeklyBarChartDay[];
  height?: number;
  /** Índice do dia a destacar com o accent — normalmente o último (hoje). */
  highlightIndex?: number;
};

/** 7 barrinhas, uma por dia — mesmo padrão do "Gastos essa semana" do Pierre. */
export function WeeklyBarChart({ data, height = 64, highlightIndex }: WeeklyBarChartProps) {
  const { tokens } = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height }}>
      {data.map((day, index) => {
        const pct = Math.max(4, (day.value / max) * 100);
        const isHighlighted = index === highlightIndex;
        return (
          <View
            key={index}
            style={{ flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: "100%",
                height: `${pct}%` as const,
                borderRadius: 5,
                backgroundColor: isHighlighted ? tokens.accent : tokens.surfaceAlt,
              }}
            />
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: tokens.textMuted }}>
              {day.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
