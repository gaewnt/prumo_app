import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { MOOD_EMOJI, type MoodLog } from "@/lib/dev-pessoal";

type MoodDayFormProps = {
  dateLabel: string;
  existingLog?: MoodLog;
  onSave: (score: number, note: string) => void;
  onDelete: () => void;
  onClose: () => void;
  isSaving: boolean;
};

export function MoodDayForm({ dateLabel, existingLog, onSave, onDelete, onClose, isSaving }: MoodDayFormProps) {
  const { tokens } = useTheme();
  const [score, setScore] = useState(existingLog?.score ?? 3);
  const [note, setNote] = useState(existingLog?.note ?? "");

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
        Humor — {dateLabel}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {MOOD_EMOJI.map((emoji, index) => {
          const value = index + 1;
          const selected = score === value;
          return (
            <Pressable
              key={value}
              onPress={() => setScore(value)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? tokens.accent : tokens.surface,
              }}
            >
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 13,
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Pressable onPress={onClose} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        {existingLog ? (
          <Pressable onPress={onDelete} style={{ paddingVertical: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
              Remover
            </Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => onSave(score, note.trim())}
          disabled={isSaving}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} size="small" />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
              Salvar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
