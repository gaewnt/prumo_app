import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

export type GoalFormInput = { title: string; targetAmount: number; targetDate: string | null; notes: string };

type NewGoalFormProps = {
  initial?: GoalFormInput;
  submitLabel?: string;
  isSaving: boolean;
  onSubmit: (input: GoalFormInput) => void;
  onCancel: () => void;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewGoalForm({ initial, submitLabel = "Salvar", isSaving, onSubmit, onCancel }: NewGoalFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountText, setAmountText] = useState(
    initial ? String(initial.targetAmount).replace(".", ",") : ""
  );
  const [dateText, setDateText] = useState(initial?.targetDate ? toBrDate(initial.targetDate) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const targetAmount = Number(amountText.replace(",", "."));
  const parsedDate = dateText.trim().length > 0 ? parseBrDate(dateText) : null;
  const dateIsValid = dateText.trim().length === 0 || parsedDate !== null;
  const isValid = title.trim().length > 0 && targetAmount > 0 && dateIsValid;

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
        placeholder="Título da meta (ex: Viagem pra praia)"
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

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Valor alvo (ex: 3000,00)"
        placeholderTextColor={tokens.textMuted}
        keyboardType="decimal-pad"
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
          Data alvo (opcional)
        </Text>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          maxLength={10}
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (!isValid) return;
            onSubmit({ title: title.trim(), targetAmount, targetDate: parsedDate, notes: notes.trim() });
          }}
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
