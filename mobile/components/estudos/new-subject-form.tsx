import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SUBJECT_COLOR_KEYS, type SubjectColorKey } from "@/lib/estudos";

type NewSubjectFormProps = {
  onSubmit: (name: string, colorKey: SubjectColorKey) => void;
  onCancel: () => void;
  isSaving: boolean;
  colorFor: (colorKey: SubjectColorKey) => string;
  /** Próxima cor sugerida — vai alternando entre as 5 pra distribuir sem a pessoa ter que escolher toda vez. */
  suggestedColor: SubjectColorKey;
};

export function NewSubjectForm({ onSubmit, onCancel, isSaving, colorFor, suggestedColor }: NewSubjectFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState<SubjectColorKey>(suggestedColor);

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
        placeholder="Nome da matéria (ex: Direito Administrativo)"
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
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Cor</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SUBJECT_COLOR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setColorKey(key)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colorFor(key),
                borderWidth: colorKey === key ? 2 : 0,
                borderColor: tokens.text,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => name.trim() && onSubmit(name.trim(), colorKey)}
          disabled={isSaving || !name.trim()}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !name.trim() ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              Salvar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
