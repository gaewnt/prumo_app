import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { formatCurrency, type Investment } from "@/lib/financas";

type InvestmentRowProps = {
  investment: Investment;
  onUpdateAmount: (amount: number) => void;
  onDelete: () => void;
  isSaving: boolean;
};

export function InvestmentRow({ investment, onUpdateAmount, onDelete, isSaving }: InvestmentRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [amountText, setAmountText] = useState(String(investment.amount).replace(".", ","));

  const parsedAmount = Number(amountText.replace(",", "."));

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {investment.name}
          </Text>
          {!isEditing ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              {formatCurrency(investment.amount)}
            </Text>
          ) : null}
        </View>

        {isSaving ? (
          <ActivityIndicator color={tokens.accent} />
        ) : !isEditing ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => setIsEditing(true)} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                Atualizar valor
              </Text>
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Excluir
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isEditing ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
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
              onPress={() => setIsEditing(false)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onUpdateAmount(parsedAmount);
                setIsEditing(false);
              }}
              disabled={!(parsedAmount >= 0)}
              style={{
                flex: 1,
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: parsedAmount >= 0 ? 1 : 0.6,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                Salvar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
