import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { formatCurrency, formatHistoryDate, type FinancialGoal } from "@/lib/financas";
import { NewGoalForm, type GoalFormInput } from "@/components/financas/new-goal-form";

type GoalRowProps = {
  goal: FinancialGoal;
  isSaving: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: GoalFormInput) => void;
  isUpdating: boolean;
  onContribute: (amount: number) => void;
  isContributing: boolean;
  onToggleCompleted: () => void;
  onDelete: () => void;
};

export function GoalRow({
  goal,
  isSaving,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
  onContribute,
  isContributing,
  onToggleCompleted,
  onDelete,
}: GoalRowProps) {
  const { tokens } = useTheme();
  const [showContributeForm, setShowContributeForm] = useState(false);
  // Guarda local e síncrona contra duplo toque, no mesmo espírito de `hasSubmittedPayment`
  // em bill-row.tsx: `isContributing` (vindo do pai) só reflete "true" depois que a
  // mutation dispara e o componente re-renderiza.
  const [hasSubmittedContribution, setHasSubmittedContribution] = useState(false);
  const [contributeAmountText, setContributeAmountText] = useState("");

  if (isEditing) {
    return (
      <NewGoalForm
        initial={{
          title: goal.title,
          targetAmount: goal.target_amount,
          targetDate: goal.target_date,
          notes: goal.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isUpdating}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
      />
    );
  }

  const contributeAmount = Number(contributeAmountText.replace(",", "."));
  const isCompleted = goal.completed_at != null;
  const isReached = goal.current_amount >= goal.target_amount;
  const progressPct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;

  function handleCancelContribute() {
    setShowContributeForm(false);
    setHasSubmittedContribution(false);
    setContributeAmountText("");
  }

  function handleConfirmContribute() {
    if (hasSubmittedContribution) return;
    if (!(contributeAmount > 0)) return;
    setHasSubmittedContribution(true);
    onContribute(contributeAmount);
    setShowContributeForm(false);
  }

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        opacity: isCompleted ? 0.85 : 1,
      }}
    >
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {goal.title}
          </Text>
          {isCompleted ? (
            <View
              style={{
                backgroundColor: tokens.successMuted,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: tokens.success }}>
                🎉 Concluída
              </Text>
            </View>
          ) : null}
        </View>
        {goal.target_date ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Até {formatHistoryDate(goal.target_date)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 14, color: tokens.text }}>
          {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
        </Text>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: tokens.surfaceAlt,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${progressPct}%`,
              height: "100%",
              borderRadius: 4,
              backgroundColor: isReached ? tokens.success : tokens.accent,
            }}
          />
        </View>
      </View>

      {goal.notes ? (
        <Text
          style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}
          numberOfLines={2}
        >
          {goal.notes}
        </Text>
      ) : null}

      {!isCompleted ? (
        <Pressable onPress={() => setShowContributeForm(true)} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            + Contribuir
          </Text>
        </Pressable>
      ) : null}

      {showContributeForm ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Valor a adicionar
          </Text>
          <TextInput
            value={contributeAmountText}
            onChangeText={setContributeAmountText}
            placeholder="Ex: 100,00"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            editable={!hasSubmittedContribution}
            autoFocus
            style={{
              fontFamily: fontFamily.body,
              fontSize: 15,
              color: tokens.text,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={handleCancelContribute}
              disabled={hasSubmittedContribution}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmContribute}
              disabled={hasSubmittedContribution || isContributing || !(contributeAmount > 0)}
              style={{
                flex: 1,
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: hasSubmittedContribution || isContributing || !(contributeAmount > 0) ? 0.6 : 1,
              }}
            >
              {isContributing ? (
                <ActivityIndicator size="small" color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                  Adicionar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {isSaving ? (
        <ActivityIndicator color={tokens.accent} />
      ) : (
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Editar
            </Text>
          </Pressable>
          <Pressable onPress={onToggleCompleted} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              {isCompleted ? "Reabrir" : "Concluir"}
            </Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Excluir
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
