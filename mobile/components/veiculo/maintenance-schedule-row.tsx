import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily, type ThemeTokens } from "@/lib/theme/tokens";
import { NewMaintenanceScheduleForm } from "@/components/veiculo/new-maintenance-schedule-form";
import { MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPE_EMOJI } from "@/components/veiculo/format";
import type { MaintenanceScheduleInput, Vehicle, VehicleMaintenanceSchedule } from "@/lib/veiculo";

type MaintenanceScheduleRowProps = {
  schedule: VehicleMaintenanceSchedule;
  vehicle: Vehicle | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: MaintenanceScheduleInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDone: () => void;
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntilDate(dateStr: string, now = new Date()): number {
  const target = new Date(`${dateStr}T12:00:00`);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/** Badge por data (igual `DeadlineRow`) combinado com o critério de km, quando existir —
 * o que vencer primeiro decide a cor/texto. */
function scheduleBadge(
  schedule: VehicleMaintenanceSchedule,
  vehicle: Vehicle | null,
  tokens: ThemeTokens
): { text: string; color: string; bg: string } | null {
  const kmHit = schedule.due_km != null && vehicle?.km_atual != null && vehicle.km_atual >= schedule.due_km;
  if (schedule.due_date) {
    const days = daysUntilDate(schedule.due_date);
    if (days < 0) return { text: `Atrasada · ${formatDate(schedule.due_date)}`, color: tokens.danger, bg: tokens.dangerMuted };
    if (days === 0) return { text: "Hoje", color: tokens.warning, bg: tokens.warningMuted };
    if (kmHit) return { text: `Bateu ${schedule.due_km!.toLocaleString("pt-BR")} km`, color: tokens.warning, bg: tokens.warningMuted };
    if (days <= 7) return { text: `Em ${days} ${days === 1 ? "dia" : "dias"}`, color: tokens.warning, bg: tokens.warningMuted };
    return { text: formatDate(schedule.due_date), color: tokens.textMuted, bg: tokens.surfaceAlt };
  }
  if (kmHit) return { text: `Bateu ${schedule.due_km!.toLocaleString("pt-BR")} km`, color: tokens.warning, bg: tokens.warningMuted };
  if (schedule.due_km != null) return { text: `Aos ${schedule.due_km.toLocaleString("pt-BR")} km`, color: tokens.textMuted, bg: tokens.surfaceAlt };
  return null;
}

export function MaintenanceScheduleRow({
  schedule,
  vehicle,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleDone,
}: MaintenanceScheduleRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewMaintenanceScheduleForm
        initial={{
          tipo: schedule.tipo,
          descricao: schedule.descricao,
          dueDate: schedule.due_date,
          dueKm: schedule.due_km,
          reminderDaysBefore: schedule.reminder_days_before,
          notes: schedule.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const badge = !schedule.done ? scheduleBadge(schedule, vehicle, tokens) : null;
  const title = schedule.descricao || MAINTENANCE_TYPE_LABELS[schedule.tipo];

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
          borderColor: schedule.done ? tokens.accent : tokens.border,
          backgroundColor: schedule.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {schedule.done ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: schedule.done ? tokens.textMuted : tokens.text,
            textDecorationLine: schedule.done ? "line-through" : "none",
          }}
        >
          {MAINTENANCE_TYPE_EMOJI[schedule.tipo]} {title}
        </Text>
        {schedule.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {schedule.notes}
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
