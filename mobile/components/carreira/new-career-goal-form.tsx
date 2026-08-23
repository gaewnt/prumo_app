import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { GoalInput } from "@/lib/carreira";

type NewCareerGoalFormProps = {
  initial?: GoalInput;
  submitLabel?: string;
  onSubmit: (input: GoalInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewCareerGoalForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewCareerGoalFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dateText, setDateText] = useState(toBrDate(initial?.targetDate ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const dateIsValid = dateText.trim().length === 0 || parseBrDate(dateText) !== null;
  const isValid = title.trim().length > 0 && dateIsValid;

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
        placeholder="Meta (ex: Virar tech lead)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <View style={{ gap: 4 }}>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="Prazo (opcional, DD/MM/AAAA)"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
        {!dateIsValid ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>Use o formato DD/MM/AAAA.</Text>
        ) : null}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({
              title: title.trim(),
              targetDate: dateText.trim() ? parseBrDate(dateText) : null,
              notes: notes.trim(),
            })
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
