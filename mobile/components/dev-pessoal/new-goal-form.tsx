import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type NewGoalFormProps = {
  initial?: { title: string; description: string; targetDate: string };
  submitLabel?: string;
  onSubmit: (input: { title: string; description: string; targetDate: string | null }) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewGoalForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewGoalFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const isValid = title.trim().length > 0;

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
        value={title}
        onChangeText={setTitle}
        placeholder="Título da meta"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 60, textAlignVertical: "top" }]}
      />
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Data alvo (opcional, AAAA-MM-DD)
        </Text>
        <TextInput
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="2026-12-31"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({ title: title.trim(), description: description.trim(), targetDate: targetDate.trim() || null })
          }
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
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
