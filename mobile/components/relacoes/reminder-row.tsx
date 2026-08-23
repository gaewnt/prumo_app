import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewReminderForm } from "@/components/relacoes/new-reminder-form";
import { formatDate, type Person, type ReminderInput, type RelationshipReminder } from "@/lib/relacoes";

type ReminderRowProps = {
  reminder: RelationshipReminder;
  person: Person | undefined;
  people: Person[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: ReminderInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDone: () => void;
};

export function ReminderRow({ reminder, person, people, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete, onToggleDone }: ReminderRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewReminderForm
        people={people}
        initial={{
          personId: reminder.person_id,
          title: reminder.title,
          reminderDate: reminder.reminder_date,
          remindMe: !!reminder.notification_id,
          notes: reminder.notes ?? "",
        }}
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
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <Pressable
        onPress={onToggleDone}
        hitSlop={8}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: reminder.done ? tokens.accent : tokens.border,
          backgroundColor: reminder.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {reminder.done ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: reminder.done ? tokens.textMuted : tokens.text,
            textDecorationLine: reminder.done ? "line-through" : "none",
          }}
        >
          {reminder.title}
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
          {formatDate(reminder.reminder_date)}
          {person ? ` · ${person.name}` : ""}
        </Text>
        {reminder.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{reminder.notes}</Text>
        ) : null}
      </View>

      <View style={{ gap: 10, alignItems: "flex-end" }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}
