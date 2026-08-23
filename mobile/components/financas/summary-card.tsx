import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { formatCurrency } from "@/lib/financas";

type SummaryCardProps = {
  income: number;
  expense: number;
  balance: number;
};

/** Visão geral do mês em 3 linhas — mesmo padrão do Fortuno. */
export function SummaryCard({ income, expense, balance }: SummaryCardProps) {
  const { tokens } = useTheme();

  const row = (label: string, value: string, color: string) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.textMuted }}>{label}</Text>
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 14, fontWeight: "500" as const, color }}>{value}</Text>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, marginBottom: 2 }}>
        Visão geral do mês
      </Text>
      {row("Receitas", formatCurrency(income), tokens.success)}
      {row("Despesas", formatCurrency(expense), tokens.danger)}
      {row("Saldo", formatCurrency(balance), balance >= 0 ? tokens.text : tokens.danger)}
    </View>
  );
}
