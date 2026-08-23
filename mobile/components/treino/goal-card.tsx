import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ProgressRing } from "@/components/ui/progress-ring";
import { NewGoalForm } from "@/components/treino/new-goal-form";
import {
  goalCurrentValue,
  goalProgressPercent,
  type TrainingGoal,
  type TrainingGoalInput,
} from "@/lib/treino";

type GoalCardProps = {
  goal: TrainingGoal;
  latestWeightKg: number | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: TrainingGoalInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onUpdateManualProgress: (value: number) => void;
  isSavingProgress: boolean;
};

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatBrDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function GoalCard({
  goal,
  latestWeightKg,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onUpdateManualProgress,
  isSavingProgress,
}: GoalCardProps) {
  const { tokens } = useTheme();
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressText, setProgressText] = useState("");

  if (isEditing) {
    return (
      <NewGoalForm
        initial={{
          title: goal.title,
          metricType: goal.metric_type,
          startValue: goal.start_value,
          targetValue: goal.target_value,
          currentValue: goal.current_value,
          unit: goal.unit,
          targetDate: goal.target_date,
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const current = goalCurrentValue(goal, latestWeightKg);
  const percent = goalProgressPercent(goal, latestWeightKg);

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
      }}
    >
      <ProgressRing percent={percent} size={56} strokeWidth={6} />

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
          {goal.title}
        </Text>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 12.5, color: tokens.textMuted }}>
          {formatValue(current)} → {formatValue(goal.target_value)} {goal.unit}
        </Text>
        {goal.target_date ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Até {formatBrDate(goal.target_date)}
          </Text>
        ) : null}

        {goal.metric_type === "custom" ? (
          editingProgress ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <TextInput
                value={progressText}
                onChangeText={setProgressText}
                placeholder={String(current)}
                placeholderTextColor={tokens.textMuted}
                keyboardType="decimal-pad"
                autoFocus
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  color: tokens.text,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  width: 64,
                }}
              />
              <Pressable
                onPress={() => {
                  const value = Number(progressText.replace(",", "."));
                  if (!Number.isNaN(value)) onUpdateManualProgress(value);
                  setEditingProgress(false);
                  setProgressText("");
                }}
                disabled={isSavingProgress}
                hitSlop={8}
              >
                {isSavingProgress ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : (
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.accent }}>
                    Salvar
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditingProgress(true)} hitSlop={8} style={{ marginTop: 4 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.accent }}>
                Atualizar progresso
              </Text>
            </Pressable>
          )
        ) : null}
      </View>

      <View style={{ gap: 10, alignItems: "flex-end" }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}
