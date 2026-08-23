import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { PetInput } from "@/lib/pet";

type NewPetFormProps = {
  initial?: PetInput;
  submitLabel?: string;
  onSubmit: (input: PetInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewPetForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewPetFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [species, setSpecies] = useState(initial?.species ?? "");
  const [birthText, setBirthText] = useState(toBrDate(initial?.birthDate ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const birthIsValid = birthText.trim().length === 0 || parseBrDate(birthText) !== null;
  const isValid = name.trim().length > 0 && birthIsValid;

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
        placeholder="Nome do pet"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <TextInput
        value={species}
        onChangeText={setSpecies}
        placeholder="Espécie/raça (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <View style={{ gap: 4 }}>
        <TextInput
          value={birthText}
          onChangeText={setBirthText}
          placeholder="Nascimento (opcional, DD/MM/AAAA)"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
        {!birthIsValid ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>Use o formato DD/MM/AAAA.</Text>
        ) : null}
      </View>
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
          onPress={() =>
            onSubmit({ name: name.trim(), species: species.trim(), birthDate: birthText.trim() ? parseBrDate(birthText) : null, notes: notes.trim() })
          }
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
