import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { PeriodKind } from "@/lib/veiculo";

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

type PeriodSwitcherProps = {
  value: PeriodKind;
  onChange: (value: PeriodKind) => void;
};

/** Pills Dia / Semana / Mês / Ano — recalcula todo o painel pro período escolhido. */
export function PeriodSwitcher({ value, onChange }: PeriodSwitcherProps) {
  const { tokens } = useTheme();

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
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
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
