import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { NewDetoxHabitForm } from "@/components/detox/new-detox-habit-form";
import { DETOX_TARGET_LABELS, type DetoxHabit, type DetoxHabitInput } from "@/lib/detox";

type DetoxHabitCardProps = {
  habit: DetoxHabit;
  todayCount: number;
  weeklyCounts: { label: string; value: number }[];
  /** Mês exibido no histórico — o seletor de mês fica na tela, compartilhado
   * entre todos os hábitos; cada card só desenha o `MonthHeatmap` com a cor do dia dele. */
  historyMonth: Date;
  getHistoryCellColor: (dateStr: string) => string | null;
  onLogOccurrence: () => void;
  isLogging: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: DetoxHabitInput) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function DetoxHabitCard({
  habit,
  todayCount,
  weeklyCounts,
  historyMonth,
  getHistoryCellColor,
  onLogOccurrence,
  isLogging,
  onUndo,
  isUndoing,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
}: DetoxHabitCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewDetoxHabitForm
        initial={{ title: habit.title, target: habit.target, notes: habit.notes ?? "", active: habit.active }}
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
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        opacity: habit.active ? 1 : 0.6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>{habit.title}</Text>
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
          {DETOX_TARGET_LABELS[habit.target].toUpperCase()}
        </Text>
        {!habit.active ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.textMuted }}>Pausado</Text>
        ) : null}
      </View>

      {habit.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{habit.notes}</Text>
      ) : null}

      <WeeklyBarChart data={weeklyCounts} height={56} highlightIndex={6} />

      <MonthHeatmap monthDate={historyMonth} showMonthLabel={false} getCellColor={getHistoryCellColor} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>Hoje: {todayCount}</Text>
        <Pressable
          onPress={onLogOccurrence}
          disabled={isLogging}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            opacity: isLogging ? 0.6 : 1,
          }}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>+1</Text>
          )}
        </Pressable>
        {todayCount > 0 ? (
          <Pressable onPress={onUndo} disabled={isUndoing} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {isUndoing ? "Desfazendo…" : "Desfazer"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
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
