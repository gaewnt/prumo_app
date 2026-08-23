import React from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WEEKDAY_SHORT } from "@/lib/dieta";

type DayTabsProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
};

export function DayTabs({ selectedDay, onSelectDay }: DayTabsProps) {
  const { tokens } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {WEEKDAY_SHORT.map((label, day) => {
          const selected = day === selectedDay;
          return (
            <Pressable
              key={day}
              onPress={() => onSelectDay(day)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
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
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
