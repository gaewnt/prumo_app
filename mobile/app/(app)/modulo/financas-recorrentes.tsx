import React, { useEffect, useRef, useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { RecurringTransactionRow } from "@/components/financas/recurring-transaction-row";
import { NewRecurringTransactionForm } from "@/components/financas/new-recurring-transaction-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancasExtras,
  fetchCustomCategories,
  allCategoryNames,
  createRecurringTransaction,
  updateRecurringTransaction,
  setRecurringTransactionActive,
  deleteRecurringTransaction,
  ensureRecurringTransactionsGenerated,
} from "@/lib/financas";

export default function FinancasRecorrentesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });

  // Mesma queryKey usada em `financas.tsx` — cache compartilhado, sem busca duplicada
  // se a pessoa já passou por lá antes.
  const customCategoriesQuery = useQuery({
    queryKey: ["financas-custom-categories", userId],
    queryFn: fetchCustomCategories,
    enabled: !!userId,
  });
  const allCategories = allCategoryNames(customCategoriesQuery.data ?? []);

  const accounts = (query.data?.accounts ?? []).filter((a) => !a.archived);
  const items = query.data?.recurringTransactions ?? [];
  const activeItems = items.filter((i) => i.active);
  const pausedItems = items.filter((i) => !i.active);

  function invalidateExtras() {
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  // Mesma ideia de `ensureCardRecurringChargesGenerated`, mas aqui em Finanças a geração já
  // acontece direto na tela principal do módulo (ver `financas.tsx`) — repetido aqui só como
  // reforço pra quem entra direto nesta tela sem passar por lá primeiro.
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (!userId || !query.data || hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;
    ensureRecurringTransactionsGenerated(userId, query.data.recurringTransactions, query.data.balanceRows)
      .then((count) => {
        if (count > 0) {
          invalidateExtras();
          queryClient.invalidateQueries({ queryKey: ["financas", userId] });
        }
      })
      .catch(() => {
        hasGeneratedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, query.data]);

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createRecurringTransaction>[1]) =>
      createRecurringTransaction(userId!, input),
    onSuccess: () => {
      setIsAdding(false);
      invalidateExtras();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRecurringTransaction>[1] }) =>
      updateRecurringTransaction(id, input),
    onSuccess: () => {
      setEditingId(null);
      invalidateExtras();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setRecurringTransactionActive(id, active),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => {
      setTogglingId(null);
      invalidateExtras();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  function renderItem(item: (typeof items)[number]) {
    return (
      <RecurringTransactionRow
        key={item.id}
        item={item}
        accounts={accounts}
        allCategories={allCategories}
        isEditing={editingId === item.id}
        onStartEdit={() => setEditingId(item.id)}
        onCancelEdit={() => setEditingId(null)}
        onUpdate={(input) => updateMutation.mutate({ id: item.id, input })}
        isUpdating={updateMutation.isPending && editingId === item.id}
        onToggleActive={() => toggleMutation.mutate({ id: item.id, active: !item.active })}
        isTogglingActive={togglingId === item.id}
        onDelete={() => deleteMutation.mutate(item.id)}
        isDeleting={deletingId === item.id}
      />
    );
  }

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
          <Text style={{ fontSize: 32 }}>🔁</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Lançamentos fixos
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Débito automático de conta ou receita recorrente — lança sozinho todo mês, sem
            precisar de cartão.
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
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Ativos
                  </Text>
                </View>
                <Pressable onPress={() => setIsAdding(!isAdding)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {isAdding ? "Cancelar" : "+ Novo"}
                  </Text>
                </Pressable>
              </View>

              {isAdding ? (
                <NewRecurringTransactionForm
                  isSaving={createMutation.isPending}
                  onCancel={() => setIsAdding(false)}
                  onSubmit={(input) => createMutation.mutate(input)}
                  accounts={accounts}
                  allCategories={allCategories}
                />
              ) : null}

              {activeItems.length === 0 && !isAdding ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum lançamento fixo cadastrado ainda.
                </Text>
              ) : (
                activeItems.map(renderItem)
              )}
            </View>

            {pausedItems.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Pausados
                </Text>
                {pausedItems.map(renderItem)}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
