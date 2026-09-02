import React from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

export type ModuleTab = {
  key: string;
  label: string;
};

type ModuleTabsProps = {
  tabs: ModuleTab[];
  active: string;
  onChange: (key: string) => void;
};

/** Fileira horizontal de pílulas — troca de aba dentro de uma tela "hub" que reúne vários módulos. */
export function ModuleTabs({ tabs, active, onChange }: ModuleTabsProps) {
  const { tokens } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              hitSlop={4}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
