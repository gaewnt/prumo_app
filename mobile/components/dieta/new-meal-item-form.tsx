import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type NewMealItemFormProps = {
  /** Preenche o campo com um item existente — usado na edição. */
  initial?: { description: string };
  /** "Adicionar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  placeholder?: string;
  onSubmit: (description: string) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewMealItemForm({
  initial,
  submitLabel = "Adicionar",
  placeholder = "Item (ex: Arroz, feijão e frango grelhado)",
  onSubmit,
  onCancel,
  isSaving,
}: NewMealItemFormProps) {
  const { tokens } = useTheme();
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
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
        onPress={() => onSubmit(description.trim())}
        disabled={isSaving || !description.trim()}
        style={{
          backgroundColor: tokens.accent,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: isSaving || !description.trim() ? 0.6 : 1,
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
