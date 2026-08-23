import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WEEKDAY_LABELS, lastSevenDays, toDateString } from "@/lib/rotina";
import type { MoodLog } from "@/lib/dev-pessoal";

type MoodStripProps = {
  logs: MoodLog[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
};

export function MoodStrip({ logs, selectedDate, onSelectDate }: MoodStripProps) {
  const { tokens } = useTheme();
  const today = toDateString(new Date());

  function colorForScore(score: number) {
    if (score <= 2) return tokens.danger;
    if (score === 3) return tokens.warning;
    return tokens.success;
  }

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {lastSevenDays().map((date) => {
        const dateStr = toDateString(date);
        const dow = date.getDay();
        const log = logs.find((l) => l.log_date === dateStr);
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === today;

        return (
          <View key={dateStr} style={{ alignItems: "center", gap: 4, flex: 1 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.textMuted }}>
              {WEEKDAY_LABELS[dow]}
            </Text>
            <Pressable
              onPress={() => onSelectDate(dateStr)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: log ? colorForScore(log.score) : tokens.surfaceAlt,
                borderWidth: isSelected ? 2 : isToday ? 1.5 : 1,
                borderColor: isSelected ? tokens.accent : tokens.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {log ? (
                <Text style={{ fontSize: 12, color: tokens.accentText }}>{log.score}</Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
