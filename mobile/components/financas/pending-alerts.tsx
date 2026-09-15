import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { billUrgency, formatCurrency, formatShortDate, type Bill } from "@/lib/financas";

/** Categoria do Planejamento mensal que já passou do valor previsto neste mês. */
export type BudgetOverrun = { category: string; planned: number; spent: number };

type PendingAlertsProps = {
  /** Contas não pagas com vencimento próximo (ver `upcomingBills`). */
  bills: Bill[];
  /** Saldo do mês menos todas as despesas pendentes (não só as próximas). */
  saldoSeguro: number;
  /** Categorias do Planejamento mensal (mês atual) com gasto acima do previsto — antes só
   * dava pra ver isso abrindo a tela de Planejamento; agora avisa aqui também, no mesmo
   * lugar das outras pendências. */
  budgetOverruns?: BudgetOverrun[];
};

/** Bloco de "pendências e alertas" no padrão do Fortuno. */
export function PendingAlerts({ bills, saldoSeguro, budgetOverruns = [] }: PendingAlertsProps) {
  const { tokens } = useTheme();
  if (bills.length === 0 && budgetOverruns.length === 0) return null;

  return (
    <View style={{ backgroundColor: tokens.warningMuted, borderRadius: 16, padding: 14, gap: 8 }}>
      {bills.length > 0 ? (
        <>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.warning }}>
            ⚠ Pendências
          </Text>

          {bills.map((bill) => {
            const urgency = billUrgency(bill);
            const when =
              urgency === "atrasada" ? "atrasada" : urgency === "vence-hoje" ? "vence hoje" : `vence ${formatShortDate(bill.due_date)}`;
            return (
              <View key={bill.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text, flex: 1 }} numberOfLines={1}>
                  {bill.name} — {when}
                </Text>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 12.5, color: tokens.textMuted }}>
                  {formatCurrency(bill.amount)}
                </Text>
              </View>
            );
          })}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 4,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: tokens.border,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.text }}>
              Saldo seguro
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12.5,
                color: saldoSeguro >= 0 ? tokens.success : tokens.danger,
              }}
            >
              {formatCurrency(saldoSeguro)}
            </Text>
          </View>
        </>
      ) : null}

      {budgetOverruns.length > 0 ? (
        <View
          style={{
            gap: 8,
            marginTop: bills.length > 0 ? 4 : 0,
            paddingTop: bills.length > 0 ? 8 : 0,
            borderTopWidth: bills.length > 0 ? 1 : 0,
            borderTopColor: tokens.border,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.danger }}>
            🔺 Orçamento estourado
          </Text>
          {budgetOverruns.map((o) => (
            <View key={o.category} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text, flex: 1 }} numberOfLines={1}>
                {o.category}
              </Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 12.5, color: tokens.danger }}>
                {formatCurrency(o.spent)} de {formatCurrency(o.planned)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
