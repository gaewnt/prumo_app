import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WEEKDAY_LABELS } from "@/lib/rotina";

type NewHabitFormProps = {
  /** Preenche o formulário com um hábito existente — usado na edição. */
  initial?: { name: string; activeDays: number[] };
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (name: string, activeDays: number[]) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewHabitForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewHabitFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [activeDays, setActiveDays] = useState<number[]>(initial?.activeDays ?? [0, 1, 2, 3, 4, 5, 6]);

  function toggleDay(day: number) {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nome do hábito (ex: Beber água, Meditar)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Repetir em quais dias
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {WEEKDAY_LABELS.map((label, day) => {
            const selected = activeDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 12,
                    color: selected ? tokens.accentText : tokens.textMuted,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onCancel}
          style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}
        >
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit(name.trim(), activeDays)}
          disabled={isSaving || !name.trim() || activeDays.length === 0}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !name.trim() || activeDays.length === 0 ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
