import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { BudgetCategoryRow } from "@/components/financas/budget-category-row";
import { NewBudgetCategoryForm } from "@/components/financas/new-budget-category-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancas,
  fetchBudgetForMonth,
  setBudgetCategory,
  deleteBudgetCategory,
  copyBudgetFromPreviousMonth,
  computeBudgetProgress,
  monthKey,
  CATEGORY_PRESETS,
} from "@/lib/financas";

export default function FinancasOrcamentoScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [monthDate, setMonthDate] = useState(new Date());
  const month = monthKey(monthDate);
  const rawMonthLabel = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const [openForm, setOpenForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ["financas", userId],
    queryFn: fetchFinancas,
    enabled: !!userId,
  });
  const budgetQuery = useQuery({
    queryKey: ["budget", userId, month],
    queryFn: () => fetchBudgetForMonth(month),
    enabled: !!userId,
  });

  const budget = budgetQuery.data ?? [];
  const transactions = transactionsQuery.data?.transactions ?? [];
  const progress = computeBudgetProgress(budget, transactions, month);
  const availableCategories = CATEGORY_PRESETS.filter((c) => !budget.some((b) => b.category === c));

  function invalidateBudget() {
    queryClient.invalidateQueries({ queryKey: ["budget", userId, month] });
  }

  const setBudgetMutation = useMutation({
    mutationFn: (input: { category: string; plannedAmount: number }) =>
      setBudgetCategory(userId!, { month, category: input.category, plannedAmount: input.plannedAmount }),
    onSuccess: () => {
      setOpenForm(false);
      invalidateBudget();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; category: string }) => deleteBudgetCategory(id),
    onMutate: ({ category }) => setDeletingId(category),
    onSettled: () => {
      setDeletingId(null);
      invalidateBudget();
    },
  });

  const copyMutation = useMutation({
    mutationFn: () => copyBudgetFromPreviousMonth(userId!, month),
    onSuccess: invalidateBudget,
  });

  const isLoading = transactionsQuery.isLoading || budgetQuery.isLoading;
  const isError = transactionsQuery.isError || budgetQuery.isError;

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
          <Text style={{ fontSize: 32 }}>📊</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Planejamento mensal
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Defina quanto pretende gastar por categoria.
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20, color: tokens.accent }}>‹</Text>
          </Pressable>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
            {monthLabel}
          </Text>
          <Pressable
            onPress={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20, color: tokens.accent }}>›</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : budget.length === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Nenhum planejamento definido para este mês.
            </Text>

            {!openForm ? (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => copyMutation.mutate()}
                  disabled={copyMutation.isPending}
                  style={{
                    backgroundColor: tokens.surfaceAlt,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: copyMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {copyMutation.isPending ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                      Copiar do mês anterior
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setOpenForm(true)}
                  style={{
                    backgroundColor: tokens.accent,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                    + Definir categoria
                  </Text>
                </Pressable>
              </View>
            ) : (
              <NewBudgetCategoryForm
                availableCategories={availableCategories}
                isSaving={setBudgetMutation.isPending}
                onSubmit={(input) => setBudgetMutation.mutate(input)}
                onCancel={() => setOpenForm(false)}
              />
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <Pressable onPress={() => copyMutation.mutate()} disabled={copyMutation.isPending} hitSlop={8}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                  {copyMutation.isPending ? "Copiando..." : "Copiar do mês anterior"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setOpenForm(!openForm)}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                  {openForm ? "Cancelar" : "+ Adicionar categoria"}
                </Text>
              </Pressable>
            </View>

            {openForm ? (
              <NewBudgetCategoryForm
                availableCategories={availableCategories}
                isSaving={setBudgetMutation.isPending}
                onSubmit={(input) => setBudgetMutation.mutate(input)}
                onCancel={() => setOpenForm(false)}
              />
            ) : null}

            {progress.map((item) => (
              <BudgetCategoryRow
                key={item.category}
                category={item.category}
                planned={item.planned}
                spent={item.spent}
                onDelete={() => {
                  const b = budget.find((b) => b.category === item.category);
                  if (b) deleteMutation.mutate({ id: b.id, category: item.category });
                }}
                isDeleting={deletingId === item.category}
                onUpdatePlanned={(plannedAmount) =>
                  setBudgetMutation.mutate({ category: item.category, plannedAmount })
                }
                isSaving={
                  setBudgetMutation.isPending && setBudgetMutation.variables?.category === item.category
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
