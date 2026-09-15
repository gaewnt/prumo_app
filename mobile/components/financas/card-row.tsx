import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  currentCardCycle,
  computeCardCycleTotal,
  closedUnpaidCycles,
  formatCurrency,
  formatShortDate,
  type CategoryColorKey,
  type CreditCard,
  type CreditCardPayment,
  type CreditCardRecurringCharge,
  type FinancialAccount,
  type FinancialTag,
  type BalanceRow,
  type TransactionKind,
} from "@/lib/financas";
import { NewCardForm, type CardFormInput } from "@/components/financas/new-card-form";
import { NewTransactionForm } from "@/components/financas/new-transaction-form";
import { NewRecurringChargeForm, type RecurringChargeFormInput } from "@/components/financas/new-recurring-charge-form";
import { RecurringChargeRow } from "@/components/financas/recurring-charge-row";

type PayCycleInput = {
  cycleStart: string;
  cycleEnd: string;
  amount: number;
  /** Total calculado do ciclo (soma dos lançamentos) — guardado à parte do valor
   * realmente pago, pra dar pra mostrar divergência depois (ver `payCardCycle`). */
  expectedAmount: number;
  paidFromAccountId: string;
};

type ChargeInput = {
  kind: TransactionKind;
  category: string;
  amount: number;
  description: string;
  cardId?: string | null;
  tagIds?: string[];
};

type CardRowProps = {
  card: CreditCard;
  accounts: FinancialAccount[];
  balanceRows: BalanceRow[];
  payments: CreditCardPayment[];
  isSaving: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: CardFormInput) => void;
  isUpdating: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onPayCycle: (input: PayCycleInput) => void;
  isPaying: boolean;
  /** Atalho para lançar uma compra direto na fatura atual. A função já existia (o formulário geral de
   * lançamento sempre deixou escolher um cartão como forma de pagamento), só não tinha
   * atalho direto aqui na tela do cartão, o que fazia com que passasse despercebida. */
  allCategories: readonly string[];
  tags: FinancialTag[];
  isCharging: boolean;
  onStartCharge: () => void;
  onCancelCharge: () => void;
  onLogCharge: (input: ChargeInput) => void;
  isLoggingCharge: boolean;
  /** Lançamentos fixos (assinaturas) de TODOS os cartões — a linha filtra os do próprio
   * cartão. Vem de `fetchFinancasExtras`, mesmo padrão de `payments`/`balanceRows`. */
  recurringCharges: CreditCardRecurringCharge[];
  isAddingRecurringCharge: boolean;
  onStartAddRecurringCharge: () => void;
  onCancelAddRecurringCharge: () => void;
  onCreateRecurringCharge: (input: RecurringChargeFormInput) => void;
  isCreatingRecurringCharge: boolean;
  editingRecurringChargeId: string | null;
  onStartEditRecurringCharge: (id: string) => void;
  onCancelEditRecurringCharge: () => void;
  onUpdateRecurringCharge: (id: string, input: RecurringChargeFormInput) => void;
  isUpdatingRecurringCharge: boolean;
  onToggleRecurringChargeActive: (charge: CreditCardRecurringCharge) => void;
  togglingRecurringChargeId: string | null;
  onDeleteRecurringCharge: (id: string) => void;
  deletingRecurringChargeId: string | null;
};

export function CardRow({
  card,
  accounts,
  balanceRows,
  payments,
  isSaving,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
  onArchiveToggle,
  onDelete,
  onPayCycle,
  isPaying,
  allCategories,
  tags,
  isCharging,
  onStartCharge,
  onCancelCharge,
  onLogCharge,
  isLoggingCharge,
  recurringCharges,
  isAddingRecurringCharge,
  onStartAddRecurringCharge,
  onCancelAddRecurringCharge,
  onCreateRecurringCharge,
  isCreatingRecurringCharge,
  editingRecurringChargeId,
  onStartEditRecurringCharge,
  onCancelEditRecurringCharge,
  onUpdateRecurringCharge,
  isUpdatingRecurringCharge,
  onToggleRecurringChargeActive,
  togglingRecurringChargeId,
  onDeleteRecurringCharge,
  deletingRecurringChargeId,
}: CardRowProps) {
  const { tokens } = useTheme();
  const [payingCycleEnd, setPayingCycleEnd] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  // Guarda local e síncrona contra duplo toque, igual ao `hasSubmittedPayment` de
  // bill-row.tsx: `isPaying` (vindo do pai) só reflete "true" depois que a mutation
  // dispara e o componente re-renderiza — nesse intervalo um segundo toque ainda
  // passaria, e aqui existe uma trava de banco (unique card_id+cycle_end) mas a UI
  // não deve depender dela pra evitar o duplo lançamento de despesa.
  const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
  // Valor a pagar editável — antes sempre mandava `cycle.total` sem chance de ajustar; agora
  // segue o mesmo padrão de `bill-row.tsx` (pré-preenchido com o previsto, mas ajustável em
  // caso de divergência, ex: anuidade que ainda não caiu no extrato).
  const [paidAmountText, setPaidAmountText] = useState("");

  if (isEditing) {
    return (
      <NewCardForm
        initial={{
          name: card.name,
          cardLimit: card.card_limit,
          closingDay: card.closing_day,
          dueDay: card.due_day,
          colorKey: card.color_key,
        }}
        submitLabel="Salvar alterações"
        isSaving={isUpdating}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
      />
    );
  }

  function startPaying(cycle: { end: string; total: number }) {
    setPayingCycleEnd(cycle.end);
    setSelectedAccountId(null);
    setHasSubmittedPayment(false);
    setPaidAmountText(String(cycle.total).replace(".", ","));
  }

  function cancelPaying() {
    setPayingCycleEnd(null);
    setSelectedAccountId(null);
    setHasSubmittedPayment(false);
  }

  const parsedPaidAmount = Number(paidAmountText.replace(",", "."));

  function confirmPaying(cycle: { start: string; end: string; total: number }) {
    if (hasSubmittedPayment || !selectedAccountId || !(parsedPaidAmount > 0)) return;
    setHasSubmittedPayment(true);
    onPayCycle({
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
      amount: parsedPaidAmount,
      expectedAmount: cycle.total,
      paidFromAccountId: selectedAccountId,
    });
    setPayingCycleEnd(null);
  }

  const openCycle = currentCardCycle(card.closing_day);
  const openTotal = computeCardCycleTotal(card.id, openCycle.start, openCycle.end, balanceRows);
  const closed = closedUnpaidCycles(card, balanceRows, payments);
  const cardRecurringCharges = recurringCharges.filter((c) => c.card_id === card.id);

  const colorKey: CategoryColorKey = card.color_key;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        opacity: card.archived ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: tokens[colorKey],
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {card.name}
          </Text>
          <Text
            style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, flexWrap: "wrap" }}
          >
            Fecha dia {card.closing_day} · Vence dia {card.due_day}
            {card.card_limit != null ? ` · Limite ${formatCurrency(card.card_limit)}` : ""}
            {card.archived ? " · arquivado" : ""}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          padding: 10,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Fatura aberta · até {formatShortDate(openCycle.end)}
          </Text>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 15, color: tokens.text }}>
            {formatCurrency(openTotal)}
          </Text>
        </View>
        {!isCharging ? (
          <Pressable onPress={onStartCharge} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
              + Lançar despesa nessa fatura
            </Text>
          </Pressable>
        ) : (
          <NewTransactionForm
            isSaving={isLoggingCharge}
            onCancel={onCancelCharge}
            onSubmit={(input) => onLogCharge(input)}
            allCategories={allCategories}
            cards={[card]}
            defaultCardId={card.id}
            tags={tags}
          />
        )}
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Lançamentos fixos
          </Text>
          {!isAddingRecurringCharge ? (
            <Pressable onPress={onStartAddRecurringCharge} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                + Novo
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isAddingRecurringCharge ? (
          <NewRecurringChargeForm
            isSaving={isCreatingRecurringCharge}
            onCancel={onCancelAddRecurringCharge}
            onSubmit={onCreateRecurringCharge}
            allCategories={allCategories}
          />
        ) : null}

        {cardRecurringCharges.length === 0 && !isAddingRecurringCharge ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Nenhuma assinatura cadastrada nesse cartão.
          </Text>
        ) : (
          cardRecurringCharges.map((charge) => (
            <RecurringChargeRow
              key={charge.id}
              charge={charge}
              allCategories={allCategories}
              isEditing={editingRecurringChargeId === charge.id}
              onStartEdit={() => onStartEditRecurringCharge(charge.id)}
              onCancelEdit={onCancelEditRecurringCharge}
              onUpdate={(input) => onUpdateRecurringCharge(charge.id, input)}
              isUpdating={isUpdatingRecurringCharge && editingRecurringChargeId === charge.id}
              onToggleActive={() => onToggleRecurringChargeActive(charge)}
              isTogglingActive={togglingRecurringChargeId === charge.id}
              onDelete={() => onDeleteRecurringCharge(charge.id)}
              isDeleting={deletingRecurringChargeId === charge.id}
            />
          ))
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
          Faturas fechadas
        </Text>

        {closed.length === 0 ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Nenhuma fatura fechada pendente.
          </Text>
        ) : (
          closed.map((cycle) => {
            const isPayingThis = payingCycleEnd === cycle.end;
            return (
              <View key={cycle.end} style={{ gap: 8 }}>
                <View
                  style={{
                    backgroundColor: tokens.surfaceAlt,
                    borderRadius: 10,
                    padding: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, flex: 1 }}
                  >
                    {formatShortDate(cycle.start)} – {formatShortDate(cycle.end)}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 14, color: tokens.warning }}>
                    {formatCurrency(cycle.total)}
                  </Text>
                  {accounts.length === 0 ? (
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                      Cadastre uma conta pra poder pagar
                    </Text>
                  ) : !isPayingThis ? (
                    <Pressable onPress={() => startPaying(cycle)} hitSlop={8}>
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                        Pagar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {isPayingThis ? (
                  <View
                    style={{
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                      borderWidth: 1,
                      borderRadius: 10,
                      padding: 10,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                      Pagar com qual conta?
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {accounts.map((acc) => {
                        const selected = selectedAccountId === acc.id;
                        return (
                          <Pressable
                            key={acc.id}
                            onPress={() => !hasSubmittedPayment && setSelectedAccountId(acc.id)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fontFamily.bodyMedium,
                                fontSize: 13,
                                color: selected ? tokens.accentText : tokens.textMuted,
                              }}
                            >
                              {acc.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                      Valor a pagar (ajuste se a fatura veio diferente do calculado)
                    </Text>
                    <TextInput
                      value={paidAmountText}
                      onChangeText={setPaidAmountText}
                      keyboardType="decimal-pad"
                      editable={!hasSubmittedPayment}
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
                        onPress={cancelPaying}
                        disabled={hasSubmittedPayment}
                        style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
                      >
                        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                          Cancelar
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmPaying(cycle)}
                        disabled={hasSubmittedPayment || !selectedAccountId || !(parsedPaidAmount > 0)}
                        style={{
                          flex: 1,
                          backgroundColor: tokens.accent,
                          borderRadius: 10,
                          paddingVertical: 10,
                          alignItems: "center",
                          opacity: hasSubmittedPayment || !selectedAccountId || !(parsedPaidAmount > 0) ? 0.6 : 1,
                        }}
                      >
                        {hasSubmittedPayment || isPaying ? (
                          <ActivityIndicator size="small" color={tokens.accentText} />
                        ) : (
                          <Text
                            style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}
                          >
                            Confirmar pagamento
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {isSaving ? (
        <ActivityIndicator color={tokens.accent} />
      ) : (
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Editar
            </Text>
          </Pressable>
          <Pressable onPress={onArchiveToggle} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              {card.archived ? "Reativar" : "Arquivar"}
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
