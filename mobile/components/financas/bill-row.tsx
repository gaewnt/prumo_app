import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { billUrgency, formatCurrency, formatShortDate, formatHistoryDate, type Bill, type FinancialAccount } from "@/lib/financas";
import { NewBillForm, type BillFormInput } from "@/components/financas/new-bill-form";

type BillRowProps = {
  bill: Bill;
  /** Contas ativas — mostra um seletor "saiu de qual conta?" na confirmação de
   * pagamento, pra dar pra descontar do saldo certo. Sem contas cadastradas,
   * o seletor nem aparece (mesmo comportamento de antes). */
  accounts: FinancialAccount[];
  onMarkPaid: (paidAmount: number, accountId: string | null) => void;
  onDelete: () => void;
  isSaving: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: BillFormInput) => void;
  isUpdating: boolean;
};

const URGENCY_LABEL: Record<string, string> = {
  paga: "Paga",
  atrasada: "Atrasada",
  "vence-hoje": "Vence hoje",
  "em-dia": "Em dia",
};

export function BillRow({
  bill,
  accounts,
  onMarkPaid,
  onDelete,
  isSaving,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
}: BillRowProps) {
  const { tokens } = useTheme();
  const urgency = billUrgency(bill);
  const [isConfirmingPay, setIsConfirmingPay] = useState(false);
  // Guarda local e síncrona contra duplo toque: `isSaving` (vindo do pai) só passa a
  // refletir "true" depois que a mutation dispara e o componente re-renderiza — nesse
  // intervalo um segundo toque ainda passava e lançava a despesa duas vezes.
  const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
  const [paidAmountText, setPaidAmountText] = useState(String(bill.amount).replace(".", ","));
  const [payFromAccountId, setPayFromAccountId] = useState<string | null>(null);

  function handleCancelPay() {
    setIsConfirmingPay(false);
    setHasSubmittedPayment(false);
    setPayFromAccountId(null);
  }

  function handleConfirmPay() {
    if (hasSubmittedPayment) return;
    setHasSubmittedPayment(true);
    onMarkPaid(parsedPaidAmount, payFromAccountId);
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

  if (isEditing) {
    return (
      <NewBillForm
        initial={{
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.due_date,
          recurring: bill.recurring,
        }}
        submitLabel="Salvar alterações"
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSaving={isUpdating}
      />
    );
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
          {urgency === "paga" && bill.paid_at ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Paga em {formatHistoryDate(bill.paid_at.slice(0, 10))}
              {paidDifferentFromExpected
                ? ` · ${formatCurrency(bill.paid_amount!)} (previsto ${formatCurrency(bill.amount)})`
                : ""}
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
            <Pressable onPress={onStartEdit} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
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

      {showConfirmForm ? (
        <View style={{ gap: 8 }}>
          {accounts.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
                Saiu de qual conta?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pressable
                  onPress={() => setPayFromAccountId(null)}
                  disabled={hasSubmittedPayment}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: payFromAccountId === null ? tokens.accent : tokens.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: payFromAccountId === null ? tokens.accentText : tokens.textMuted,
                    }}
                  >
                    Nenhuma
                  </Text>
                </Pressable>
                {accounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => setPayFromAccountId(acc.id)}
                    disabled={hasSubmittedPayment}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: payFromAccountId === acc.id ? tokens.accent : tokens.surfaceAlt,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.bodyMedium,
                        fontSize: 12.5,
                        color: payFromAccountId === acc.id ? tokens.accentText : tokens.textMuted,
                      }}
                    >
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {payFromAccountId === null ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.warning }}>
                  Sem conta selecionada, esse pagamento não desconta o saldo de nenhuma conta.
                </Text>
              ) : null}
            </View>
          ) : null}
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
