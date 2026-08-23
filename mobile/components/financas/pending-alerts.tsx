import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { billUrgency, formatCurrency, formatShortDate, type Bill } from "@/lib/financas";

type PendingAlertsProps = {
  /** Contas não pagas com vencimento próximo (ver `upcomingBills`). */
  bills: Bill[];
  /** Saldo do mês menos todas as despesas pendentes (não só as próximas). */
  saldoSeguro: number;
};

/** Bloco de "pendências e alertas" no padrão do Fortuno. */
export function PendingAlerts({ bills, saldoSeguro }: PendingAlertsProps) {
  const { tokens } = useTheme();
  if (bills.length === 0) return null;

  return (
    <View style={{ backgroundColor: tokens.warningMuted, borderRadius: 16, padding: 14, gap: 8 }}>
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
    </View>
  );
}
