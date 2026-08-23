import React from "react";
import { Text, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type OptionPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Opção de escolha única/múltipla do onboarding — cartão full-width, no padrão dos prints de referência. */
export function OptionPill({ label, selected, onPress }: OptionPillProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: selected ? tokens.accent : tokens.border,
        backgroundColor: selected ? tokens.accentMuted : tokens.surface,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          fontFamily: selected ? fontFamily.bodySemibold : fontFamily.bodyMedium,
          fontSize: 15,
          color: selected ? tokens.accent : tokens.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
