import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, Switch } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { categoryEmoji, formatCurrency } from "@/lib/financas";

type BudgetCategoryRowProps = {
  category: string;
  planned: number;
  spent: number;
  onDelete: () => void;
  isDeleting: boolean;
  isEnvelope: boolean;
  /** `null` quando não é envelope, ou quando o saldo ainda não terminou de carregar. */
  envelopeBalance: number | null;
  onUpdate: (input: { plannedAmount: number; isEnvelope: boolean }) => void;
  isSaving: boolean;
};

export function BudgetCategoryRow({
  category,
  planned,
  spent,
  onDelete,
  isDeleting,
  isEnvelope,
  envelopeBalance,
  onUpdate,
  isSaving,
}: BudgetCategoryRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [amountText, setAmountText] = useState(String(planned));
  const [editEnvelope, setEditEnvelope] = useState(isEnvelope);

  const overBudget = spent > planned;
  const ratio = planned > 0 ? spent / planned : 0;
  const barColor = overBudget ? tokens.danger : ratio >= 0.8 ? tokens.warning : tokens.success;
  const fillWidth = planned > 0 ? Math.min(100, (spent / planned) * 100) : spent > 0 ? 100 : 0;

  function startEdit() {
    setAmountText(String(planned));
    setEditEnvelope(isEnvelope);
    setIsEditing(true);
  }

  function save() {
    const value = Number(amountText.replace(",", "."));
    if (value > 0) {
      onUpdate({ plannedAmount: value, isEnvelope: editEnvelope });
      setIsEditing(false);
    }
  }

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tokens.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16 }}>{categoryEmoji(category)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {category}
          </Text>
          {isEditing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                {formatCurrency(spent)} de
              </Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                autoFocus
                style={{
                  minWidth: 0,
                  flexShrink: 1,
                  fontFamily: fontFamily.body,
                  fontSize: 12.5,
                  color: tokens.text,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              />
            </View>
          ) : (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {formatCurrency(spent)} de {formatCurrency(planned)}
            </Text>
          )}
        </View>
        {isEditing ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable onPress={save} disabled={isSaving || !(Number(amountText.replace(",", ".")) > 0)} hitSlop={8}>
              {isSaving ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12.5, color: tokens.accent }}>
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={startEdit} hitSlop={8}>
              <Text style={{ fontSize: 14 }}>✎</Text>
            </Pressable>
            {isDeleting ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Pressable onPress={onDelete} hitSlop={8}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                  Excluir
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isEditing ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.text }}>
            Modo envelope (guardar sobra)
          </Text>
          <Switch
            value={editEnvelope}
            onValueChange={setEditEnvelope}
            trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
          />
        </View>
      ) : null}

      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: tokens.surfaceAlt,
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <View
          style={{
            width: `${fillWidth}%`,
            height: "100%",
            borderRadius: 4,
            backgroundColor: barColor,
          }}
        />
      </View>

      {isEnvelope && envelopeBalance !== null ? (
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: envelopeBalance < 0 ? tokens.dangerMuted : tokens.successMuted,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 11.5,
              color: envelopeBalance < 0 ? tokens.danger : tokens.success,
            }}
          >
            {envelopeBalance < 0
              ? `Envelope no vermelho: ${formatCurrency(envelopeBalance)}`
              : `💰 Saldo guardado: ${formatCurrency(envelopeBalance)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
