import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { categoryEmoji, formatCurrency, type FinancialAccount, type RecurringTransaction } from "@/lib/financas";
import {
  NewRecurringTransactionForm,
  type RecurringTransactionFormInput,
} from "@/components/financas/new-recurring-transaction-form";

type RecurringTransactionRowProps = {
  item: RecurringTransaction;
  accounts: FinancialAccount[];
  allCategories: readonly string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: RecurringTransactionFormInput) => void;
  isUpdating: boolean;
  onToggleActive: () => void;
  isTogglingActive: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

export function RecurringTransactionRow({
  item,
  accounts,
  allCategories,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
  onToggleActive,
  isTogglingActive,
  onDelete,
  isDeleting,
}: RecurringTransactionRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewRecurringTransactionForm
        isEditing
        initial={{
          kind: item.kind,
          accountId: item.account_id,
          name: item.name,
          amount: item.amount,
          category: item.category,
          dayOfMonth: item.day_of_month,
          installmentsRemaining: item.installments_remaining,
        }}
        submitLabel="Salvar alterações"
        isSaving={isUpdating}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        accounts={accounts}
        allCategories={allCategories}
      />
    );
  }

  const isBusy = isTogglingActive || isDeleting;
  const accountName = item.account_id ? accounts.find((a) => a.id === item.account_id)?.name : null;
  // Desativado sozinho por ter zerado as parcelas (ver `ensureRecurringTransactionsGenerated`)
  // é um estado diferente de pausado manualmente — "quitado" deixa isso claro.
  const isPaidOff = !item.active && item.installments_remaining === 0;

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 10,
        padding: 10,
        gap: 6,
        opacity: item.active ? 1 : 0.55,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 16 }}>{categoryEmoji(item.category)}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
            {item.name}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            {item.kind === "expense" ? "Débito" : "Receita"} todo dia {item.day_of_month} · {item.category}
            {accountName ? ` · ${accountName}` : ""}
            {item.installments_remaining !== null && item.installments_remaining > 0
              ? ` · faltam ${item.installments_remaining}`
              : ""}
            {isPaidOff ? " · quitado" : !item.active ? " · pausado" : ""}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 14,
            color: item.kind === "expense" ? tokens.text : tokens.success,
          }}
        >
          {item.kind === "expense" ? "-" : "+"}
          {formatCurrency(item.amount)}
        </Text>
      </View>

      {isBusy ? (
        <ActivityIndicator size="small" color={tokens.accent} />
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Editar
            </Text>
          </Pressable>
          <Pressable onPress={onToggleActive} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {item.active ? "Pausar" : "Reativar"}
            </Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Excluir
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
