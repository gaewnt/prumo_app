import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { Exercise } from "@/lib/treino";

type ExerciseChecklistItemProps = {
  exercise: Exercise;
  isDone: boolean;
  isToggling: boolean;
  onToggle: () => void;
};

export function ExerciseChecklistItem({ exercise, isDone, isToggling, onToggle }: ExerciseChecklistItemProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={isToggling}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: isDone ? tokens.accent : tokens.border,
          backgroundColor: isDone ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color={isDone ? tokens.accentText : tokens.accent} />
        ) : isDone ? (
          <Text style={{ fontSize: 14, color: tokens.accentText }}>✓</Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodyMedium,
            fontSize: 14,
            color: tokens.text,
            textDecorationLine: isDone ? "line-through" : "none",
          }}
        >
          {exercise.name}
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {exercise.sets}x{exercise.reps}
          {exercise.load_label ? ` · ${exercise.load_label}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}
