import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewCareerGoalForm } from "@/components/carreira/new-career-goal-form";
import { deriveGoalStatus, daysUntilDate, formatDate, type CareerGoal, type GoalInput } from "@/lib/carreira";

type CareerGoalCardProps = {
  goal: CareerGoal;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: GoalInput) => void;
  isSaving: boolean;
  onToggleCompleted: () => void;
  onDelete: () => void;
};

export function CareerGoalCard({ goal, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onToggleCompleted, onDelete }: CareerGoalCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewCareerGoalForm
        initial={{ title: goal.title, targetDate: goal.target_date, notes: goal.notes ?? "" }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const isCompleted = !!goal.completed_at;
  const status = deriveGoalStatus(goal);
  const statusMeta =
    status === "completed"
      ? { label: "Concluída", color: tokens.success, bg: tokens.successMuted }
      : status === "overdue"
        ? { label: "Atrasada", color: tokens.danger, bg: tokens.dangerMuted }
        : { label: "Em andamento", color: tokens.accent, bg: tokens.accentMuted };
  const remainingDays = goal.target_date && status === "active" ? daysUntilDate(goal.target_date) : null;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      <Pressable onPress={onToggleCompleted} hitSlop={8}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            borderWidth: 1.5,
            borderColor: isCompleted ? tokens.success : tokens.border,
            backgroundColor: isCompleted ? tokens.success : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isCompleted ? <Text style={{ fontSize: 14, color: tokens.accentText }}>✓</Text> : null}
        </View>
      </Pressable>

      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text
            style={{
              fontFamily: fontFamily.bodySemibold,
              fontSize: 15,
              color: tokens.text,
              textDecorationLine: isCompleted ? "line-through" : "none",
            }}
          >
            {goal.title}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 10.5,
              color: statusMeta.color,
              backgroundColor: statusMeta.bg,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            {statusMeta.label.toUpperCase()}
          </Text>
        </View>
        {goal.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>{goal.notes}</Text>
        ) : null}
        {goal.target_date ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Prazo: {formatDate(goal.target_date)}
            {remainingDays !== null && remainingDays >= 0 ? ` · faltam ${remainingDays} ${remainingDays === 1 ? "dia" : "dias"}` : ""}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 12, alignItems: "flex-end" }}>
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
