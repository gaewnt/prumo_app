import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily, type ThemeTokens } from "@/lib/theme/tokens";
import { NewTaskForm } from "@/components/estudos/new-task-form";
import { daysUntilDate, formatDueDate, type StudyTask, type StudyTaskInput, type Subject, type SubjectColorKey } from "@/lib/estudos";

type TaskRowProps = {
  task: StudyTask;
  subject: Subject | undefined;
  subjects: Subject[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: StudyTaskInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDone: () => void;
  colorFor: (colorKey: SubjectColorKey) => string;
};

function dueBadge(dueDate: string, tokens: ThemeTokens) {
  const days = daysUntilDate(dueDate);
  if (days < 0) return { text: `Atrasada · ${formatDueDate(dueDate)}`, color: tokens.danger, bg: tokens.dangerMuted };
  if (days === 0) return { text: "Hoje", color: tokens.warning, bg: tokens.warningMuted };
  if (days <= 3) return { text: `Em ${days} ${days === 1 ? "dia" : "dias"}`, color: tokens.warning, bg: tokens.warningMuted };
  return { text: formatDueDate(dueDate), color: tokens.textMuted, bg: tokens.surfaceAlt };
}

export function TaskRow({
  task,
  subject,
  subjects,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleDone,
  colorFor,
}: TaskRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewTaskForm
        subjects={subjects}
        initial={{
          title: task.title,
          subjectId: task.subject_id,
          dueDate: task.due_date,
          notes: task.notes ?? "",
          reminderDaysBefore: task.reminder_days_before,
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
        colorFor={colorFor}
      />
    );
  }

  const badge = !task.done && task.due_date ? dueBadge(task.due_date, tokens) : null;

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
          borderColor: task.done ? tokens.accent : tokens.border,
          backgroundColor: task.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {task.done ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        {subject ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colorFor(subject.color_key) }} />
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: tokens.textMuted }}>
              {subject.name.toUpperCase()}
            </Text>
          </View>
        ) : null}
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: task.done ? tokens.textMuted : tokens.text,
            textDecorationLine: task.done ? "line-through" : "none",
          }}
        >
          {task.title}
        </Text>
        {task.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {task.notes}
          </Text>
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
        ) : task.done && task.due_date ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Prazo era {formatDueDate(task.due_date)}
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
