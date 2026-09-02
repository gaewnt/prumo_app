import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { AccountRow } from "@/components/financas/account-row";
import { NewAccountForm } from "@/components/financas/new-account-form";
import { TransferForm } from "@/components/financas/transfer-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancasExtras,
  computeAccountBalance,
  computeTotalAccountsBalance,
  accountHistory,
  updateTransactionAccount,
  deleteTransaction,
  formatCurrency,
  createAccount,
  updateAccount,
  setAccountArchived,
  deleteAccount,
  createTransferBetweenAccounts,
} from "@/lib/financas";

type OpenForm = "none" | "account" | "transfer";

export default function FinancasContasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState<OpenForm>("none");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [movingHistoryEntryId, setMovingHistoryEntryId] = useState<string | null>(null);
  const [deletingHistoryEntryId, setDeletingHistoryEntryId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });

  const accounts = query.data?.accounts ?? [];
  const balanceRows = query.data?.balanceRows ?? [];
  const activeAccounts = accounts.filter((a) => !a.archived).sort((a, b) => a.position - b.position);
  const archivedAccounts = accounts.filter((a) => a.archived).sort((a, b) => a.position - b.position);

  function invalidateExtras() {
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  const createAccountMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAccount>[1]) => createAccount(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidateExtras();
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateAccount>[1] }) =>
      updateAccount(id, input),
    onSuccess: () => {
      setEditingAccountId(null);
      invalidateExtras();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setAccountArchived(id, archived),
    onMutate: ({ id }) => setSavingAccountId(id),
    onSettled: () => {
      setSavingAccountId(null);
      invalidateExtras();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onMutate: (id) => setSavingAccountId(id),
    onSettled: () => {
      setSavingAccountId(null);
      invalidateExtras();
      // Apagar uma conta zera (SET NULL) o account_id de qualquer lançamento que
      // apontava pra ela, o que também muda os dados da tela principal de Finanças.
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (input: Parameters<typeof createTransferBetweenAccounts>[1]) =>
      createTransferBetweenAccounts(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  // Editar/excluir lançamento direto do histórico por conta — pra
  // corrigir um lançamento errado (mover de conta, ou tirar de vez) sem precisar achá-lo
  // de novo em Finanças.
  const moveHistoryEntryMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTransactionAccount>[1] }) =>
      updateTransactionAccount(id, patch),
    onMutate: ({ id }) => setMovingHistoryEntryId(id),
    onSettled: () => {
      setMovingHistoryEntryId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const deleteHistoryEntryMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: (id) => setDeletingHistoryEntryId(id),
    onSettled: () => {
      setDeletingHistoryEntryId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const totalBalance = computeTotalAccountsBalance(accounts, balanceRows);

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🏦</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Contas
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Saldo por conta e transferência entre elas.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Saldo total em contas
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 24,
                  color: totalBalance >= 0 ? tokens.text : tokens.danger,
                }}
              >
                {formatCurrency(totalBalance)}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Suas contas
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "account" ? "none" : "account")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "account" ? "Cancelar" : "+ Nova conta"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "account" ? (
                <NewAccountForm
                  isSaving={createAccountMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) =>
                    createAccountMutation.mutate({ ...input, position: accounts.length })
                  }
                />
              ) : null}

              {activeAccounts.length === 0 && openForm !== "account" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma conta cadastrada ainda.
                </Text>
              ) : (
                activeAccounts.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    balance={computeAccountBalance(acc, balanceRows)}
                    history={accountHistory(acc, balanceRows)}
                    accounts={activeAccounts}
                    onMoveHistoryEntry={(entryId, patch) => moveHistoryEntryMutation.mutate({ id: entryId, patch })}
                    movingHistoryEntryId={movingHistoryEntryId}
                    onDeleteHistoryEntry={(entryId) => deleteHistoryEntryMutation.mutate(entryId)}
                    deletingHistoryEntryId={deletingHistoryEntryId}
                    isSaving={savingAccountId === acc.id}
                    isEditing={editingAccountId === acc.id}
                    onStartEdit={() => setEditingAccountId(acc.id)}
                    onCancelEdit={() => setEditingAccountId(null)}
                    onUpdate={(input) => updateAccountMutation.mutate({ id: acc.id, input })}
                    isUpdating={updateAccountMutation.isPending && editingAccountId === acc.id}
                    onArchiveToggle={() => archiveMutation.mutate({ id: acc.id, archived: !acc.archived })}
                    onDelete={() => deleteAccountMutation.mutate(acc.id)}
                  />
                ))
              )}

              {archivedAccounts.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    Contas arquivadas
                  </Text>
                  {archivedAccounts.map((acc) => (
                    <AccountRow
                      key={acc.id}
                      account={acc}
                      balance={computeAccountBalance(acc, balanceRows)}
                      history={accountHistory(acc, balanceRows)}
                    accounts={activeAccounts}
                    onMoveHistoryEntry={(entryId, patch) => moveHistoryEntryMutation.mutate({ id: entryId, patch })}
                    movingHistoryEntryId={movingHistoryEntryId}
                    onDeleteHistoryEntry={(entryId) => deleteHistoryEntryMutation.mutate(entryId)}
                    deletingHistoryEntryId={deletingHistoryEntryId}
                      isSaving={savingAccountId === acc.id}
                      isEditing={editingAccountId === acc.id}
                      onStartEdit={() => setEditingAccountId(acc.id)}
                      onCancelEdit={() => setEditingAccountId(null)}
                      onUpdate={(input) => updateAccountMutation.mutate({ id: acc.id, input })}
                      isUpdating={updateAccountMutation.isPending && editingAccountId === acc.id}
                      onArchiveToggle={() => archiveMutation.mutate({ id: acc.id, archived: !acc.archived })}
                      onDelete={() => deleteAccountMutation.mutate(acc.id)}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Transferir entre contas
                  </Text>
                </View>
                {activeAccounts.length >= 2 ? (
                  <Pressable onPress={() => setOpenForm(openForm === "transfer" ? "none" : "transfer")}>
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                      {openForm === "transfer" ? "Cancelar" : "+ Transferir"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {activeAccounts.length < 2 ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Cadastre pelo menos 2 contas pra transferir entre elas.
                </Text>
              ) : openForm === "transfer" ? (
                <TransferForm
                  accounts={activeAccounts}
                  isSaving={transferMutation.isPending}
                  onSubmit={(input) => transferMutation.mutate(input)}
                  onCancel={() => setOpenForm("none")}
                />
              ) : null}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
