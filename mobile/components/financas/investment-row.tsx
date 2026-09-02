import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { formatCurrency, type Investment } from "@/lib/financas";

type InvestmentRowProps = {
  investment: Investment;
  /** Antes só dava pra atualizar o valor; o nome (ex: corrigir
   * "Tesourp Selic" pra "Tesouro Selic") ficava travado pra sempre. */
  onUpdate: (input: { name: string; amount: number }) => void;
  onDelete: () => void;
  isSaving: boolean;
};

export function InvestmentRow({ investment, onUpdate, onDelete, isSaving }: InvestmentRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(investment.name);
  const [amountText, setAmountText] = useState(String(investment.amount).replace(".", ","));

  const parsedAmount = Number(amountText.replace(",", "."));
  const isValid = name.trim().length > 0 && parsedAmount >= 0;

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
            <Pressable
              onPress={() => {
                setName(investment.name);
                setAmountText(String(investment.amount).replace(".", ","));
                setIsEditing(true);
              }}
              hitSlop={8}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                Editar
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
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={tokens.textMuted}
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
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Valor atual"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
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
                onUpdate({ name: name.trim(), amount: parsedAmount });
                setIsEditing(false);
              }}
              disabled={!isValid}
              style={{
                flex: 1,
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: isValid ? 1 : 0.6,
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
