import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewCareEventForm } from "@/components/pet/new-care-event-form";
import { CARE_EVENT_KIND_LABELS, daysUntil, formatEventDate, type CareEventInput, type PetCareEvent } from "@/lib/pet";

type CareEventCardProps = {
  event: PetCareEvent;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: CareEventInput) => void;
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

export function CareEventCard({ event, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete, onToggleCompleted }: CareEventCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewCareEventForm
        initial={{
          kind: event.kind,
          scheduledAt: new Date(event.scheduled_at),
          reminderOffsetMinutes: event.reminder_offset_minutes,
          notes: event.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const isCompleted = !!event.completed_at;
  const daysAway = daysUntil(event.scheduled_at);
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: tokens.text,
            textDecorationLine: isCompleted ? "line-through" : "none",
          }}
        >
          {CARE_EVENT_KIND_LABELS[event.kind]}
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
      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{formatEventDate(event.scheduled_at)}</Text>
      {event.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{event.notes}</Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable onPress={onToggleCompleted} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            {isCompleted ? "Reabrir" : "Marcar como feito"}
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
