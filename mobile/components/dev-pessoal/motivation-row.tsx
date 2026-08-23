import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewMotivationForm } from "@/components/dev-pessoal/new-motivation-form";
import type { Motivation } from "@/lib/dev-pessoal";

type MotivationRowProps = {
  motivation: Motivation;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (label: string) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function MotivationRow({
  motivation,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
}: MotivationRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewMotivationForm
        initial={{ label: motivation.label }}
        submitLabel="Salvar"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
      <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>
        {motivation.label}
      </Text>
      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
