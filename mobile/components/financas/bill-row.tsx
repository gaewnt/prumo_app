import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { billUrgency, formatCurrency, formatShortDate, type Bill } from "@/lib/financas";

type BillRowProps = {
  bill: Bill;
  onMarkPaid: (paidAmount: number) => void;
  onDelete: () => void;
  isSaving: boolean;
};

const URGENCY_LABEL: Record<string, string> = {
  paga: "Paga",
  atrasada: "Atrasada",
  "vence-hoje": "Vence hoje",
  "em-dia": "Em dia",
};

export function BillRow({ bill, onMarkPaid, onDelete, isSaving }: BillRowProps) {
  const { tokens } = useTheme();
  const urgency = billUrgency(bill);
  const [isConfirmingPay, setIsConfirmingPay] = useState(false);
  // Guarda local e síncrona contra duplo toque: `isSaving` (vindo do pai) só passa a
  // refletir "true" depois que a mutation dispara e o componente re-renderiza — nesse
  // intervalo um segundo toque ainda passava e lançava a despesa duas vezes.
  const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
  const [paidAmountText, setPaidAmountText] = useState(String(bill.amount).replace(".", ","));

  function handleCancelPay() {
    setIsConfirmingPay(false);
    setHasSubmittedPayment(false);
  }

  function handleConfirmPay() {
    if (hasSubmittedPayment) return;
    setHasSubmittedPayment(true);
    onMarkPaid(parsedPaidAmount);
  }

  const badgeColor =
    urgency === "atrasada"
      ? tokens.danger
      : urgency === "vence-hoje"
        ? tokens.warning
        : urgency === "paga"
          ? tokens.success
          : tokens.textMuted;

  const parsedPaidAmount = Number(paidAmountText.replace(",", "."));
  const paidDifferentFromExpected =
    bill.paid_amount != null && Math.abs(bill.paid_amount - bill.amount) >= 0.01;
  // Deriva da urgência (não só do estado local) pra não "travar" a linha sem nenhum botão
  // caso o pagamento seja confirmado com sucesso mas `isConfirmingPay` não seja resetado.
  const showConfirmForm = isConfirmingPay && urgency !== "paga";

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {bill.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Vence {formatShortDate(bill.due_date)} · {formatCurrency(bill.amount)}
            </Text>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: badgeColor }}>
              {URGENCY_LABEL[urgency]}
            </Text>
          </View>
          {urgency === "paga" && paidDifferentFromExpected ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.warning }}>
              Pago com ajuste: {formatCurrency(bill.paid_amount!)} (previsto {formatCurrency(bill.amount)})
            </Text>
          ) : null}
        </View>

        {isSaving ? (
          <ActivityIndicator color={tokens.accent} />
        ) : !showConfirmForm ? (
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            {urgency !== "paga" ? (
              <Pressable onPress={() => setIsConfirmingPay(true)} hitSlop={8}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                  Marcar paga
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onDelete} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Excluir
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {showConfirmForm ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Valor realmente pago (ajuste se teve multa ou desconto)
          </Text>
          <TextInput
            value={paidAmountText}
            onChangeText={setPaidAmountText}
            keyboardType="decimal-pad"
            editable={!hasSubmittedPayment}
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
              onPress={handleCancelPay}
              disabled={hasSubmittedPayment}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmPay}
              disabled={hasSubmittedPayment || !(parsedPaidAmount > 0)}
              style={{
                flex: 1,
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: hasSubmittedPayment || !(parsedPaidAmount > 0) ? 0.6 : 1,
              }}
            >
              {hasSubmittedPayment ? (
                <ActivityIndicator size="small" color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                  Confirmar pagamento
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
