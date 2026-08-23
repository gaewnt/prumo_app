import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily, type ThemeTokens } from "@/lib/theme/tokens";
import { NewDeadlineForm } from "@/components/carreira/new-deadline-form";
import { daysUntilDate, formatDate, type CareerDeadline, type DeadlineInput } from "@/lib/carreira";

type DeadlineRowProps = {
  deadline: CareerDeadline;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: DeadlineInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDone: () => void;
};

function dueBadge(dueDate: string, tokens: ThemeTokens) {
  const days = daysUntilDate(dueDate);
  if (days < 0) return { text: `Atrasado · ${formatDate(dueDate)}`, color: tokens.danger, bg: tokens.dangerMuted };
  if (days === 0) return { text: "Hoje", color: tokens.warning, bg: tokens.warningMuted };
  if (days <= 3) return { text: `Em ${days} ${days === 1 ? "dia" : "dias"}`, color: tokens.warning, bg: tokens.warningMuted };
  return { text: formatDate(dueDate), color: tokens.textMuted, bg: tokens.surfaceAlt };
}

export function DeadlineRow({ deadline, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete, onToggleDone }: DeadlineRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewDeadlineForm
        initial={{ title: deadline.title, dueDate: deadline.due_date, reminderDaysBefore: deadline.reminder_days_before, notes: deadline.notes ?? "" }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const badge = !deadline.done ? dueBadge(deadline.due_date, tokens) : null;

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
          borderColor: deadline.done ? tokens.accent : tokens.border,
          backgroundColor: deadline.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {deadline.done ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: deadline.done ? tokens.textMuted : tokens.text,
            textDecorationLine: deadline.done ? "line-through" : "none",
          }}
        >
          {deadline.title}
        </Text>
        {deadline.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{deadline.notes}</Text>
        ) : null}
        {badge ? (
          <Text
            style={{
              alignSelf: "flex-start",
              fontFamily: fontFamily.mono,
              fontSize: 11.5,
              color: badge.color,
              backgroundColor: badge.bg,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginTop: 2,
              overflow: "hidden",
            }}
          >
            {badge.text}
          </Text>
        ) : deadline.done ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Prazo era {formatDate(deadline.due_date)}
          </Text>
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
