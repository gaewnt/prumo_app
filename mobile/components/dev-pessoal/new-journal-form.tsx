import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { MOOD_EMOJI } from "@/lib/dev-pessoal";

type NewJournalFormProps = {
  initial?: { content: string; moodScore: number | null };
  submitLabel?: string;
  onSubmit: (input: { content: string; moodScore: number | null }) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewJournalForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewJournalFormProps) {
  const { tokens } = useTheme();
  const [content, setContent] = useState(initial?.content ?? "");
  const [moodScore, setMoodScore] = useState<number | null>(initial?.moodScore ?? null);

  const isValid = content.trim().length > 0;

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
        value={content}
        onChangeText={setContent}
        placeholder="O que você quer registrar hoje?"
        placeholderTextColor={tokens.textMuted}
        multiline
        autoFocus
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: 90,
          textAlignVertical: "top",
        }}
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Humor (opcional)
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {MOOD_EMOJI.map((emoji, index) => {
            const score = index + 1;
            const selected = moodScore === score;
            return (
              <Pressable
                key={score}
                onPress={() => setMoodScore(selected ? null : score)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ content: content.trim(), moodScore })}
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
