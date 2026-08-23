import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { DETOX_TARGETS, DETOX_TARGET_LABELS, type DetoxHabitInput, type DetoxTarget } from "@/lib/detox";

type NewDetoxHabitFormProps = {
  initial?: DetoxHabitInput;
  submitLabel?: string;
  onSubmit: (input: DetoxHabitInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewDetoxHabitForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewDetoxHabitFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [target, setTarget] = useState<DetoxTarget>(initial?.target ?? "reduzir");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const isValid = title.trim().length > 0;

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
        placeholder="Hábito (ex: Cigarro, Tela à noite)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DETOX_TARGETS.map((t) => {
          const selected = target === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTarget(t)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: selected ? tokens.accent : tokens.surfaceAlt }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: selected ? tokens.accentText : tokens.text }}>
                {DETOX_TARGET_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {initial ? (
        <Pressable onPress={() => setActive((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: active ? tokens.accent : tokens.border,
              backgroundColor: active ? tokens.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {active ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
          </View>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>Ativo</Text>
        </Pressable>
      ) : null}

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
          onPress={() => onSubmit({ title: title.trim(), target, notes: notes.trim(), active })}
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
