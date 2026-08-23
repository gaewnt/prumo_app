import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NewTripForm } from "@/components/viagens/new-trip-form";
import { formatTripDates, type Trip, type TripInput } from "@/lib/viagens";

type TripCardProps = {
  trip: Trip;
  isSelected: boolean;
  onSelect: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: TripInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  checklistProgress: { done: number; total: number; ratio: number };
};

export function TripCard({
  trip,
  isSelected,
  onSelect,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  checklistProgress,
}: TripCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewTripForm
        initial={{
          name: trip.name,
          destination: trip.destination ?? "",
          startDate: trip.start_date,
          endDate: trip.end_date,
          status: trip.status,
          notes: trip.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const dates = formatTripDates(trip);

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: tokens.surface,
        borderColor: isSelected ? tokens.accent : tokens.border,
        borderWidth: isSelected ? 1.5 : 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>{trip.name}</Text>
          {trip.destination ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              {trip.destination}
              {dates ? ` · ${dates}` : ""}
            </Text>
          ) : dates ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{dates}</Text>
          ) : null}
        </View>
      </View>

      {checklistProgress.total > 0 ? (
        <View style={{ gap: 4 }}>
          <ProgressBar progress={checklistProgress.ratio} color={tokens.accent} />
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Checklist: {checklistProgress.done}/{checklistProgress.total}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
