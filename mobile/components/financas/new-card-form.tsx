import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { CategoryColorKey } from "@/lib/financas";
import { ColorSwatchPicker } from "@/components/financas/color-swatch-picker";

export type CardFormInput = {
  name: string;
  cardLimit: number | null;
  closingDay: number;
  dueDay: number;
  colorKey: CategoryColorKey;
};

type NewCardFormProps = {
  /** Preenche o formulário com um cartão existente — usado na edição. */
  initial?: CardFormInput;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  isSaving: boolean;
  onSubmit: (input: CardFormInput) => void;
  onCancel: () => void;
};

function parseDay(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < 1 || n > 28) return null;
  return n;
}

export function NewCardForm({
  initial,
  submitLabel = "Salvar",
  isSaving,
  onSubmit,
  onCancel,
}: NewCardFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [limitText, setLimitText] = useState(
    initial?.cardLimit != null ? String(initial.cardLimit).replace(".", ",") : ""
  );
  const [closingDayText, setClosingDayText] = useState(initial ? String(initial.closingDay) : "");
  const [dueDayText, setDueDayText] = useState(initial ? String(initial.dueDay) : "");
  const [colorKey, setColorKey] = useState<CategoryColorKey>(initial?.colorKey ?? "accent");

  const closingDay = parseDay(closingDayText);
  const dueDay = parseDay(dueDayText);
  const isValid = name.trim().length > 0 && closingDay !== null && dueDay !== null;

  function handleSubmit() {
    if (!isValid) return;
    const parsedLimit = Number(limitText.replace(",", "."));
    onSubmit({
      name: name.trim(),
      cardLimit: limitText.trim() && Number.isFinite(parsedLimit) ? parsedLimit : null,
      closingDay: closingDay!,
      dueDay: dueDay!,
      colorKey,
    });
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
        placeholder="Nome do cartão (ex: Nubank)"
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
        value={limitText}
        onChangeText={setLimitText}
        placeholder="Limite (opcional)"
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Fecha dia
          </Text>
          <TextInput
            value={closingDayText}
            onChangeText={setClosingDayText}
            placeholder="Ex: 10"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
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
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Vence dia
          </Text>
          <TextInput
            value={dueDayText}
            onChangeText={setDueDayText}
            placeholder="Ex: 17"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
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
        </View>
      </View>

      <ColorSwatchPicker selected={colorKey} onSelect={setColorKey} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
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
