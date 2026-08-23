import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewJournalForm } from "@/components/dev-pessoal/new-journal-form";
import { MOOD_EMOJI, type JournalEntry } from "@/lib/dev-pessoal";

function formatEntryDate(iso: string) {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(2);
  return `${d}/${m}/${y}`;
}

type JournalEntryRowProps = {
  entry: JournalEntry;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: { content: string; moodScore: number | null }) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function JournalEntryRow({
  entry,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
}: JournalEntryRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewJournalForm
        initial={{ content: entry.content, moodScore: entry.mood_score }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {formatEntryDate(entry.created_at)}
          </Text>
          {entry.mood_score ? <Text style={{ fontSize: 14 }}>{MOOD_EMOJI[entry.mood_score - 1]}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
          </Pressable>
        </View>
      </View>
      <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>{entry.content}</Text>
    </View>
  );
}
