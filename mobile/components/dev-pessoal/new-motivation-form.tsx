import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type NewMotivationFormProps = {
  initial?: { label: string };
  submitLabel?: string;
  onSubmit: (label: string) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewMotivationForm({
  initial,
  submitLabel = "Adicionar",
  onSubmit,
  onCancel,
  isSaving,
}: NewMotivationFormProps) {
  const { tokens } = useTheme();
  const [label, setLabel] = useState(initial?.label ?? "");

  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Uma frase que te motiva"
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
        onPress={() => onSubmit(label.trim())}
        disabled={isSaving || !label.trim()}
        style={{
          backgroundColor: tokens.accent,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: isSaving || !label.trim() ? 0.6 : 1,
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
