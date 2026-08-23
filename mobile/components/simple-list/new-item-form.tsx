import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { SimpleListItemDraft } from "@/lib/simple-list";

type NewItemFormProps = {
  /** Rótulo do campo de grupo (ex: "Matéria", "Pet"). Omitido = módulo não usa grupo. */
  groupLabel?: string;
  /** Rótulo do campo de data (ex: "Prazo", "Data"). Omitido = módulo não usa data. */
  dateLabel?: string;
  /** Preenche o formulário com um item existente — usado na edição. */
  initial?: SimpleListItemDraft;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (draft: SimpleListItemDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function NewItemForm({
  groupLabel,
  dateLabel,
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewItemFormProps) {
  const { tokens } = useTheme();
  const [groupName, setGroupName] = useState(initial?.group_name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [itemDate, setItemDate] = useState(initial?.item_date ?? "");

  const trimmedDate = itemDate.trim();
  const dateIsValid = trimmedDate === "" || DATE_PATTERN.test(trimmedDate);

  function handleSubmit() {
    if (!title.trim() || !dateIsValid) return;
    onSubmit({
      group_name: groupName.trim() || null,
      title: title.trim(),
      notes: notes.trim() || null,
      item_date: trimmedDate || null,
    });
  }

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
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      {groupLabel ? (
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder={groupLabel}
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
      ) : null}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Título"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 60, textAlignVertical: "top" }]}
      />

      {dateLabel ? (
        <View style={{ gap: 4 }}>
          <TextInput
            value={itemDate}
            onChangeText={setItemDate}
            placeholder={`${dateLabel} (AAAA-MM-DD, opcional)`}
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!dateIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.danger }}>
              Use o formato AAAA-MM-DD (ex: 2026-09-15).
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={isSaving || !title.trim() || !dateIsValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !title.trim() || !dateIsValid ? 0.6 : 1,
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
