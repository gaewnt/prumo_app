import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewClassScheduleForm } from "@/components/estudos/new-class-schedule-form";
import {
  CLASS_REMINDER_OPTIONS,
  minutesBetween,
  mostRecentOccurrenceDate,
  type ClassSchedule,
  type ClassScheduleInput,
  type Subject,
  type SubjectColorKey,
} from "@/lib/estudos";
import { toDateString } from "@/lib/rotina";

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
  /** Marca a ocorrência mais recente dessa aula (hoje,
   * ou o dia anterior mais recente em que caiu esse dia da semana, se a pessoa esqueceu de
   * marcar na hora) como concluída, registrando a duração da aula (fim - início) como uma
   * sessão de estudo da matéria, na data certa. Só precisa que a aula tenha hora de
   * término cadastrada. */
  onMarkDone?: (minutes: number, sessionDate: string) => void;
  isMarkingDone?: boolean;
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
  onMarkDone,
  isMarkingDone,
}: ClassScheduleRowProps) {
  const { tokens } = useTheme();
  const occurrenceDate = mostRecentOccurrenceDate(schedule.weekday);
  const occurrenceDateStr = toDateString(occurrenceDate);
  const isToday = occurrenceDateStr === toDateString(new Date());
  const classMinutes = minutesBetween(schedule.start_time, schedule.end_time);
  const canMarkDone = classMinutes !== null && !!onMarkDone;
  // Confirmação local (não persistida) — some se a tela recarregar, mas evita mostrar o
  // botão de novo imediatamente após tocar, o que convidaria a tocar duas vezes seguidas.
  const [justMarked, setJustMarked] = useState(false);

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

        {canMarkDone && classMinutes !== null ? (
          justMarked ? (
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.success }}>
              ✓ Estudou {formatClassDuration(classMinutes)} {isToday ? "hoje" : `em ${formatShortDate(occurrenceDateStr)}`}
            </Text>
          ) : (
            <Pressable
              onPress={() => {
                onMarkDone?.(classMinutes, occurrenceDateStr);
                setJustMarked(true);
              }}
              disabled={isMarkingDone}
              hitSlop={4}
              style={{ marginTop: 2 }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                {isMarkingDone
                  ? "Registrando…"
                  : isToday
                    ? `Marcar aula de hoje como concluída (+${formatClassDuration(classMinutes)})`
                    : `Marcar aula de ${formatShortDate(occurrenceDateStr)} como concluída (+${formatClassDuration(classMinutes)})`}
              </Text>
            </Pressable>
          )
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

/** "2026-09-01" -> "01/09" — o schema guarda a data como texto ISO. */
function formatShortDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** "3h50min" / "45min" — mesmo padrão de leitura rápida usado no resto do módulo. */
function formatClassDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}min`;
}
