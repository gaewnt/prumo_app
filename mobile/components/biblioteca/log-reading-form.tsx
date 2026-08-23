import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type LogReadingFormProps = {
  /** Preenche com o valor de um registro existente — usado na edição. */
  initial?: { pagesRead: number };
  submitLabel?: string;
  onSubmit: (pagesRead: number) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function LogReadingForm({
  initial,
  submitLabel = "Registrar",
  onSubmit,
  onCancel,
  isSaving,
}: LogReadingFormProps) {
  const { tokens } = useTheme();
  const [pagesText, setPagesText] = useState(initial ? String(initial.pagesRead) : "");
  const pagesRead = Number(pagesText);
  const isValid = pagesRead > 0;

  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <TextInput
        value={pagesText}
        onChangeText={setPagesText}
        placeholder="Páginas lidas"
        placeholderTextColor={tokens.textMuted}
        keyboardType="number-pad"
        autoFocus
        style={{
          flex: 1,
          fontFamily: fontFamily.body,
          fontSize: 14,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />
      <Pressable onPress={onCancel} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
          Cancelar
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSubmit(pagesRead)}
        disabled={isSaving || !isValid}
        style={{
          backgroundColor: tokens.accent,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: isSaving || !isValid ? 0.6 : 1,
        }}
      >
        {isSaving ? (
          <ActivityIndicator color={tokens.accentText} size="small" />
        ) : (
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
            {submitLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
