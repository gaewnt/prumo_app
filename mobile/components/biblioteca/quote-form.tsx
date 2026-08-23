import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type QuoteFormProps = {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  isSaving: boolean;
};

/** Registro rápido de trecho/citação — texto direto, no estilo do Seeds. */
export function QuoteForm({ onSubmit, onCancel, isSaving }: QuoteFormProps) {
  const { tokens } = useTheme();
  const [content, setContent] = useState("");
  const isValid = content.trim().length > 0;

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Cole ou digite o trecho..."
        placeholderTextColor={tokens.textMuted}
        multiline
        autoFocus
        style={{
          fontFamily: fontFamily.body,
          fontSize: 14,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 64,
          textAlignVertical: "top",
        }}
      />
      <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit(content.trim())}
          disabled={isSaving || !isValid}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            opacity: isSaving || !isValid ? 0.6 : 1,
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
