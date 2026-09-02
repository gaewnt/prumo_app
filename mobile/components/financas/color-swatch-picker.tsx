import React from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import type { CategoryColorKey } from "@/lib/financas";

const OPTIONS: CategoryColorKey[] = [
  "accent",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "success",
  "warning",
  "danger",
];

type ColorSwatchPickerProps = {
  selected: CategoryColorKey;
  onSelect: (key: CategoryColorKey) => void;
};

/** Seletor de cor genérico (conta, cartão, tag) — reaproveita os mesmos tokens do
 * `CategoryIconGrid`, só que sem emoji, já que conta/cartão/tag não têm ícone fixo. */
export function ColorSwatchPicker({ selected, onSelect }: ColorSwatchPickerProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {OPTIONS.map((key) => {
        const isSelected = key === selected;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            hitSlop={6}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: tokens[key],
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isSelected ? 2.5 : 0,
              borderColor: tokens.text,
            }}
          />
        );
      })}
    </View>
  );
}
