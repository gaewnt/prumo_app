import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { CategoryColorKey } from "@/lib/financas";
import { ColorSwatchPicker } from "@/components/financas/color-swatch-picker";

type NewTagFormProps = {
  isSaving: boolean;
  onSubmit: (input: { name: string; colorKey: CategoryColorKey }) => void;
  onCancel: () => void;
  /** Preenche com a tag já salva — usado pra editar. */
  initial?: { name: string; colorKey: CategoryColorKey };
  submitLabel?: string;
};

export function NewTagForm({ isSaving, onSubmit, onCancel, initial, submitLabel }: NewTagFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [colorKey, setColorKey] = useState<CategoryColorKey>(initial?.colorKey ?? "chart1");

  const isValid = name.trim().length > 0;

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
        placeholder="Reembolsável"
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

      <ColorSwatchPicker selected={colorKey} onSelect={setColorKey} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ name: name.trim(), colorKey })}
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
              {submitLabel ?? "Salvar"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
