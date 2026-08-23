import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewClassScheduleForm } from "@/components/estudos/new-class-schedule-form";
import {
  CLASS_REMINDER_OPTIONS,
  type ClassSchedule,
  type ClassScheduleInput,
  type Subject,
  type SubjectColorKey,
} from "@/lib/estudos";

type ClassScheduleRowProps = {
  schedule: ClassSchedule;
  subject: Subject | undefined;
  subjects: Subject[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (subjectId: string, input: ClassScheduleInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  colorFor: (colorKey: SubjectColorKey) => string;
};

export function ClassScheduleRow({
  schedule,
  subject,
  subjects,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  colorFor,
}: ClassScheduleRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewClassScheduleForm
        subjects={subjects}
        initial={{
          subjectId: schedule.subject_id,
          weekday: schedule.weekday,
          startTime: schedule.start_time,
          endTime: schedule.end_time ?? "",
          location: schedule.location ?? "",
          reminderMinutesBefore: schedule.reminder_minutes_before,
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
        colorFor={colorFor}
      />
    );
  }

  const reminderLabel = CLASS_REMINDER_OPTIONS.find((o) => o.value === schedule.reminder_minutes_before)?.label;

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
      {subject ? (
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorFor(subject.color_key), marginTop: 6 }}
        />
      ) : null}

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
          {subject?.name ?? "Matéria removida"}
        </Text>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, color: tokens.textMuted }}>
          {schedule.start_time}
          {schedule.end_time ? ` – ${schedule.end_time}` : ""}
        </Text>
        {schedule.location ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {schedule.location}
          </Text>
        ) : null}
        {reminderLabel && schedule.reminder_minutes_before !== null ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.accent }}>
            🔔 {reminderLabel}
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
