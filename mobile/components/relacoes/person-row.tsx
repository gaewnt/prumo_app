import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewPersonForm } from "@/components/relacoes/new-person-form";
import { formatBirthdayLabel, type Person, type PersonInput } from "@/lib/relacoes";

type PersonRowProps = {
  person: Person;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: PersonInput) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function PersonRow({ person, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete }: PersonRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewPersonForm
        initial={{ name: person.name, relationship: person.relationship ?? "", birthDate: person.birth_date, notes: person.notes ?? "" }}
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
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14.5, color: tokens.text }}>{person.name}</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {[person.relationship, person.birth_date ? `🎂 ${formatBirthdayLabel(person.birth_date)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
