import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  ACCOUNT_KIND_LABELS,
  formatCurrency,
  type AccountKind,
  type AccountHistoryEntry,
  type CategoryColorKey,
  type FinancialAccount,
} from "@/lib/financas";
import { NewAccountForm } from "@/components/financas/new-account-form";
import { AccountHistoryRow } from "@/components/financas/account-history-row";

const HISTORY_DISPLAY_LIMIT = 50;

type AccountRowProps = {
  account: FinancialAccount;
  balance: number;
  /** Lançamentos que compõem o saldo dessa conta — pra dar pra conferir de onde
   * vem o número, em vez de só confiar nele. */
  history: AccountHistoryEntry[];
  /** Todas as contas ativas — pro seletor de "mover pra conta" dentro do histórico. */
  accounts: FinancialAccount[];
  isSaving: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: { name: string; kind: AccountKind; initialBalance: number; colorKey: CategoryColorKey }) => void;
  isUpdating: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onMoveHistoryEntry: (entryId: string, patch: { accountId?: string | null; transferToAccountId?: string | null }) => void;
  movingHistoryEntryId: string | null;
  onDeleteHistoryEntry: (entryId: string) => void;
  deletingHistoryEntryId: string | null;
};

export function AccountRow({
  account,
  balance,
  history,
  accounts,
  isSaving,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
  onArchiveToggle,
  onDelete,
  onMoveHistoryEntry,
  movingHistoryEntryId,
  onDeleteHistoryEntry,
  deletingHistoryEntryId,
}: AccountRowProps) {
  const { tokens } = useTheme();
  const [showHistory, setShowHistory] = useState(false);
  const visibleHistory = history.slice(0, HISTORY_DISPLAY_LIMIT);

  if (isEditing) {
    return (
      <NewAccountForm
        initial={{
          name: account.name,
          kind: account.kind,
          initialBalance: account.initial_balance,
          colorKey: account.color_key,
        }}
        submitLabel="Salvar alterações"
        isSaving={isUpdating}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
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
        opacity: account.archived ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: tokens[account.color_key],
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {account.name}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {ACCOUNT_KIND_LABELS[account.kind]}
            {account.archived ? " · arquivada" : ""}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 16,
            color: balance >= 0 ? tokens.text : tokens.danger,
          }}
        >
          {formatCurrency(balance)}
        </Text>
      </View>

      <Pressable onPress={() => setShowHistory((v) => !v)} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
          {showHistory ? "Ocultar histórico" : `Ver histórico (${history.length})`}
        </Text>
      </Pressable>

      {showHistory ? (
        history.length === 0 ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            Nenhum lançamento nessa conta ainda — o saldo acima vem só do saldo inicial.
          </Text>
        ) : (
          <View style={{ gap: 2 }}>
            {visibleHistory.map((entry, index) => (
              <AccountHistoryRow
                key={entry.id + (entry.signedAmount >= 0 ? "-in" : "-out")}
                entry={entry}
                accounts={accounts}
                isFirst={index === 0}
                onMove={(patch) => onMoveHistoryEntry(entry.id, patch)}
                isMoving={movingHistoryEntryId === entry.id}
                onDelete={() => onDeleteHistoryEntry(entry.id)}
                isDeleting={deletingHistoryEntryId === entry.id}
              />
            ))}
            {history.length > HISTORY_DISPLAY_LIMIT ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted, marginTop: 4 }}>
                Mostrando os {HISTORY_DISPLAY_LIMIT} mais recentes de {history.length}.
              </Text>
            ) : null}
          </View>
        )
      ) : null}

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
              {account.archived ? "Reativar" : "Arquivar"}
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
