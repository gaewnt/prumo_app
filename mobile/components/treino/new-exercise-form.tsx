import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type NewExerciseFormProps = {
  /** Preenche o formulário com um exercício existente — usado na edição. */
  initial?: { name: string; sets: number; reps: number; loadLabel: string };
  /** "Adicionar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (input: { name: string; sets: number; reps: number; loadLabel: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewExerciseForm({
  initial,
  submitLabel = "Adicionar",
  onSubmit,
  onCancel,
  isSaving,
}: NewExerciseFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [setsText, setSetsText] = useState(initial ? String(initial.sets) : "3");
  const [repsText, setRepsText] = useState(initial ? String(initial.reps) : "12");
  const [loadLabel, setLoadLabel] = useState(initial?.loadLabel ?? "");

  const sets = Number(setsText);
  const reps = Number(repsText);
  const isValid = name.trim().length > 0 && sets > 0 && reps > 0;

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Exercício (ex: Supino reto)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={setsText}
          onChangeText={setSetsText}
          placeholder="Séries"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={[inputStyle, { flex: 1 }]}
        />
        <TextInput
          value={repsText}
          onChangeText={setRepsText}
          placeholder="Reps"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={[inputStyle, { flex: 1 }]}
        />
      </View>
      <TextInput
        value={loadLabel}
        onChangeText={setLoadLabel}
        placeholder="Carga (opcional, ex: 22 kg)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ name: name.trim(), sets, reps, loadLabel: loadLabel.trim() })}
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
