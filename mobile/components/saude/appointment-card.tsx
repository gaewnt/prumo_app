import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewAppointmentForm } from "@/components/saude/new-appointment-form";
import { APPOINTMENT_KIND_LABELS, daysUntil, formatAppointmentDate, type Appointment, type AppointmentKind } from "@/lib/saude";

type AppointmentFormInput = {
  title: string;
  kind: AppointmentKind;
  professional: string;
  scheduledAt: Date;
  reminderOffsetMinutes: number | null;
  notes: string;
};

type AppointmentCardProps = {
  appointment: Appointment;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: AppointmentFormInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleCompleted: () => void;
};

function countdownLabel(daysAway: number) {
  if (daysAway < 0) return null;
  if (daysAway === 0) return "Hoje";
  if (daysAway === 1) return "Amanhã";
  return `Em ${daysAway} dias`;
}

export function AppointmentCard({
  appointment,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleCompleted,
}: AppointmentCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewAppointmentForm
        initial={{
          title: appointment.title,
          kind: appointment.kind,
          professional: appointment.professional ?? "",
          scheduledAt: new Date(appointment.scheduled_at),
          reminderOffsetMinutes: appointment.reminder_offset_minutes,
          notes: appointment.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const isCompleted = !!appointment.completed_at;
  const daysAway = daysUntil(appointment.scheduled_at);
  const countdown = !isCompleted ? countdownLabel(daysAway) : null;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text
              style={{
                fontFamily: fontFamily.bodySemibold,
                fontSize: 15,
                color: tokens.text,
                textDecorationLine: isCompleted ? "line-through" : "none",
              }}
            >
              {appointment.title}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 10.5,
                color: tokens.accent,
                backgroundColor: tokens.accentMuted,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              {APPOINTMENT_KIND_LABELS[appointment.kind].toUpperCase()}
            </Text>
            {countdown ? (
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 10.5,
                  color: daysAway === 0 ? tokens.danger : tokens.textMuted,
                  backgroundColor: daysAway === 0 ? tokens.dangerMuted : tokens.surfaceAlt,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                {countdown.toUpperCase()}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {formatAppointmentDate(appointment.scheduled_at)}
            {appointment.professional ? ` · ${appointment.professional}` : ""}
          </Text>
          {appointment.notes ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              {appointment.notes}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable onPress={onToggleCompleted} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            {isCompleted ? "Reabrir" : "Marcar como feita"}
          </Text>
        </Pressable>
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
